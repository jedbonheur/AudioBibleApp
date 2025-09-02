import Foundation
import AVFoundation
import React

@objc(BackgroundMusicManager)
class BackgroundMusicManager: RCTEventEmitter {
    // Streaming player + looper for seamless looping from a remote URL
    private var queuePlayer: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    private var itemStatusObserver: NSKeyValueObservation?
    private var playerStatusObserver: NSKeyValueObservation?
    private var accessLogObserver: NSObjectProtocol?
    private var playbackStalledObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?
    private var routeChangeObserver: NSObjectProtocol?
    private var currentUrl: String?
    private var currentVolume: Float = 0.3
    private var isConfigured = false
    private var debugLogs = false
    private var hasJsListeners = false

    private func log(_ msg: String, type: String = "log", extra: [String: Any]? = nil) {
        if debugLogs { NSLog("[BGMusic] \(msg)") }
        if debugLogs && hasJsListeners {
            var payload: [String: Any] = [
                "type": type,
                "message": msg,
                "timestamp": Date().timeIntervalSince1970
            ]
            if let extra = extra {
                for (k, v) in extra { payload[k] = v }
            }
            sendEvent(withName: "BackgroundMusicEvent", body: payload)
        }
    }

    // MARK: - RCTEventEmitter
    override func supportedEvents() -> [String]! { ["BackgroundMusicEvent"] }
    override static func requiresMainQueueSetup() -> Bool { true }
    override func startObserving() { hasJsListeners = true }
    override func stopObserving() { hasJsListeners = false }

    private func ensureSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth, .allowAirPlay]
            )
            try session.setActive(true, options: [])
            if !isConfigured {
                log("Audio session configured: playback+mix, active")
                let cat = session.category.rawValue
                let mode = session.mode.rawValue
                let route = session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ",")
                log("session category=\(cat), mode=\(mode), route=\(route)", extra: ["category": cat, "mode": mode, "route": route])
            }
            isConfigured = true
        } catch {
            log("Audio session error: \(error.localizedDescription)")
        }
    }

    @objc func setDebugLogging(_ enabled: Bool) {
        debugLogs = enabled
    log("debugLogs=\(enabled)")
    }

    private func attachObservers(for item: AVPlayerItem, on qp: AVQueuePlayer) {
        // Observe item readiness and start only when ready
    self.itemStatusObserver = item.observe(\.status, options: [.initial, .new]) { [weak self] itm, _ in
            guard let self = self else { return }
            switch itm.status {
            case .unknown:
                self.log("item status: unknown")
            case .readyToPlay:
                self.log("item status: readyToPlay")
                self.ensureSession()
                qp.volume = self.currentVolume
                if qp.timeControlStatus != .playing {
                    qp.play()
                }
            case .failed:
                self.log("item status: failed: \(String(describing: itm.error?.localizedDescription))")
            @unknown default:
                self.log("item status: @unknown")
            }
        }

        // Observe player time control state
    self.playerStatusObserver = qp.observe(\.timeControlStatus, options: [.initial, .new]) { [weak self] player, _ in
            switch player.timeControlStatus {
            case .paused: self?.log("player: paused")
            case .playing: self?.log("player: playing")
            case .waitingToPlayAtSpecifiedRate: self?.log("player: waitingToPlayAtSpecifiedRate")
            @unknown default: self?.log("player: @unknown timeControlStatus")
            }
        }

        // Observe access log entry as readiness signal
        self.accessLogObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemNewAccessLogEntry, object: item, queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.log("item access log entry (network ready)")
            self.ensureSession()
            qp.volume = self.currentVolume
            if qp.timeControlStatus != .playing {
                qp.play()
                self.log("started bg after access log, volume=\(self.currentVolume)")
            }
        }

        // Observe playback stall to retry
        self.playbackStalledObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemPlaybackStalled, object: item, queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.log("playback stalled; retrying")
            self.ensureSession()
            qp.play()
        }

        // Observe audio session interruptions
        self.interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] notif in
            guard let self = self else { return }
            let userInfo = notif.userInfo ?? [:]
            let typeVal = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt
            let type = typeVal.flatMap { AVAudioSession.InterruptionType(rawValue: $0) }
            if type == .began {
                self.log("session interruption began")
            } else if type == .ended {
                self.log("session interruption ended; reactivating")
                self.ensureSession()
                qp.volume = self.currentVolume
                if qp.timeControlStatus != .playing { qp.play() }
            }
        }

        // Route changes (e.g., headphones unplugged) may pause playback
        self.routeChangeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
        ) { [weak self] notif in
            guard let self = self else { return }
            let reasonVal = (notif.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) ?? 0
            let reason = AVAudioSession.RouteChangeReason(rawValue: reasonVal)
            if reason == .oldDeviceUnavailable {
                self.log("route change: old device unavailable, resuming if needed")
                self.ensureSession()
                if qp.timeControlStatus != .playing { qp.play() }
            }
        }
    }

    private func detachObservers() {
        if let obs = accessLogObserver { NotificationCenter.default.removeObserver(obs) }
        if let obs = playbackStalledObserver { NotificationCenter.default.removeObserver(obs) }
        if let obs = interruptionObserver { NotificationCenter.default.removeObserver(obs) }
        if let obs = routeChangeObserver { NotificationCenter.default.removeObserver(obs) }
        accessLogObserver = nil
        playbackStalledObserver = nil
        interruptionObserver = nil
        routeChangeObserver = nil
        itemStatusObserver = nil
        playerStatusObserver = nil
    }

    private func preparePlayerIfNeeded() -> AVQueuePlayer {
        if let qp = queuePlayer { return qp }
        let qp = AVQueuePlayer()
        qp.automaticallyWaitsToMinimizeStalling = true
        qp.actionAtItemEnd = .advance
        qp.volume = currentVolume
        queuePlayer = qp
        return qp
    }

    private func replaceItem(with url: URL, on qp: AVQueuePlayer) {
        // Remove old observers tied to the previous item
        detachObservers()
        // Remove old looper
        looper = nil
        // Build new item and looper
        let item = AVPlayerItem(url: url)
        item.preferredForwardBufferDuration = 5.0
        // Clear existing items and insert new template
        qp.removeAllItems()
    // Insert the item so first playback uses this instance we observe
    qp.insert(item, after: nil)
    let newLooper = AVPlayerLooper(player: qp, templateItem: item)
        looper = newLooper
        // Attach observers to the new item
        attachObservers(for: item, on: qp)
    }

    @objc func play(_ urlString: String, volume: NSNumber?) {
        ensureSession()
        let vol = max(0.0, min(1.0, volume?.floatValue ?? currentVolume))
        currentVolume = vol

        guard !urlString.isEmpty, let url = URL(string: urlString) else {
            log("invalid URL: \(urlString)")
            return
        }

        let qp = preparePlayerIfNeeded()
        qp.volume = vol

        if currentUrl == urlString {
            // Same URL: just ensure session and play
            ensureSession()
            if qp.timeControlStatus != .playing { qp.play() }
            log("resumed bg with volume=\(vol)")
            return
        }

        currentUrl = urlString
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.ensureSession()
            self.replaceItem(with: url, on: qp)
            qp.volume = self.currentVolume
            if qp.timeControlStatus != .playing { qp.play() }
            self.log("switched bg url and started, volume=\(self.currentVolume)")
        }
    }

    @objc func pause() {
        if let qp = queuePlayer {
            qp.pause()
            log("paused bg")
        }
    }

    @objc func stop() {
        stopInternal()
    }

    private func stopInternal() {
    if let qp = queuePlayer { qp.pause() }
    detachObservers()
    looper = nil
    queuePlayer = nil
    currentUrl = nil
    }

    @objc func setVolume(_ volume: NSNumber) {
        let vol = max(0.0, min(1.0, volume.floatValue))
        currentVolume = vol
        ensureSession()
        if let qp = queuePlayer {
            qp.volume = vol
            if qp.timeControlStatus == .paused && currentUrl != nil {
                // In case session flip paused it, nudge it
                qp.play()
            }
        }
        log("setVolume=\(vol)")
    }

    @objc func syncWithBible(_ isBiblePlaying: Bool, url: String?, volume: NSNumber?) {
        if isBiblePlaying {
            play(url ?? currentUrl ?? "", volume: volume)
        } else {
            // Soft-pause: do not tear down; keep ready in background to survive lockscreen toggles
            if let qp = queuePlayer, qp.timeControlStatus != .paused {
                qp.pause()
                log("soft-paused bg")
            }
        }
    }
}

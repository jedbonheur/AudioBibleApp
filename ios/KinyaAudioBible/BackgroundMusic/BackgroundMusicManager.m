// Bridge file exposing the Swift BackgroundMusicManager (event emitter) to React Native
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BackgroundMusicManager, RCTEventEmitter)

RCT_EXTERN_METHOD(setDebugLogging:(BOOL)enabled)
RCT_EXTERN_METHOD(play:(NSString *)url volume:(nonnull NSNumber *)volume)
RCT_EXTERN_METHOD(pause)
RCT_EXTERN_METHOD(stop)
RCT_EXTERN_METHOD(setVolume:(nonnull NSNumber *)volume)
RCT_EXTERN_METHOD(syncWithBible:(BOOL)isBiblePlaying url:(NSString *)url volume:(nonnull NSNumber *)volume)

@end

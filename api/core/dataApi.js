/**
 * Ultra-fast local data API wrapper for the Kinyarwanda Bible JSON.
 * Fully cached and indexed for instant lookups by id or name.
 * Section lookup is now case-insensitive.
 */

const structure = require('../assets/bible-kinyarwanda/KinyarwandaBibleStructure.json');

// Cached flattened array of all books
let cachedBooks = null;

// Indexed maps for O(1) lookups
let booksById = null;
let booksByName = null;

/**
 * Flatten all books and build indexes for fast access.
 */
function initializeCache() {
  if (cachedBooks) return; // Already initialized

  cachedBooks = [];
  booksById = new Map();
  booksByName = new Map();

  Object.entries(structure).forEach(([section, books]) => {
    books.forEach((b) => {
      const book = { ...b, section }; // add section info
      cachedBooks.push(book);
      booksById.set(Number(book.id), book);
      booksByName.set(String(book.name).toLowerCase(), book);
    });
  });
}

/**
 * Returns the full Bible structure.
 * @returns {Object}
 */
function getStructure() {
  return structure;
}

/**
 * Returns all books flattened or by section (case-insensitive).
 * @param {{section?: string}} [opts]
 * @returns {Array<Object>}
 */
function getBooks(opts = {}) {
  initializeCache();

  if (opts.section) {
    const sectionKey = Object.keys(structure).find(
      (key) => key.toLowerCase() === opts.section.toLowerCase()
    );
    if (!sectionKey) throw new Error(`Section "${opts.section}" not found`);
    return structure[sectionKey];
  }

  return cachedBooks;
}

/**
 * Find a book by numeric id.
 * @param {number|string} id
 * @returns {Object}
 */
function getBookById(id) {
  initializeCache();

  const numeric = Number(id);
  if (Number.isNaN(numeric)) throw new Error(`Invalid book id: ${id}`);

  const book = booksById.get(numeric);
  if (!book) throw new Error(`Book not found with id: ${id}`);

  return book;
}

/**
 * Find a book by name (case-insensitive).
 * @param {string} name
 * @returns {Object}
 */
function getBookByName(name) {
  initializeCache();

  if (!name) throw new Error('Missing book name');

  const lower = String(name).toLowerCase();
  const book = booksByName.get(lower);

  if (!book) throw new Error(`Book not found with name: "${name}"`);

  return book;
}

module.exports = {
  getStructure,
  getBooks,
  getBookById,
  getBookByName,
};

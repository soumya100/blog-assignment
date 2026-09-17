const slugifyLib = require('slugify');

/**
 * Generates a clean URL slug from title
 * @param {string} text 
 * @returns {string}
 */
const generateSlug = (text) => {
  if (!text) return '';
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  });
};

/**
 * Ensures unique slug in a given Mongoose model
 * @param {Model} model - Mongoose model
 * @param {string} baseText - text to slugify
 * @param {string} currentId - current document ID if updating
 * @returns {Promise<string>}
 */
const createUniqueSlug = async (model, baseText, currentId = null) => {
  const baseSlug = generateSlug(baseText) || 'post';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentId) {
      query._id = { $ne: currentId };
    }
    const existing = await model.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

module.exports = {
  generateSlug,
  createUniqueSlug,
};

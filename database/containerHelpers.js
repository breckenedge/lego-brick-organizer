/**
 * Helper functions for working with the flexible container system
 */

/**
 * Get the full path for a container (e.g., "BS1/SPB2/Bin5")
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @returns {string} Full path with / separators
 */
function getContainerPath(db, containerId) {
  const path = [];
  let currentId = containerId;

  while (currentId !== null) {
    const container = db.prepare(`
      SELECT container_id, parent_id FROM containers WHERE id = ?
    `).get(currentId);

    if (!container) break;

    path.unshift(container.container_id);
    currentId = container.parent_id;
  }

  return path.join('/');
}

/**
 * Get full container details including path and type info
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @returns {Object} Container with path and type details
 */
function getContainerDetails(db, containerId) {
  const container = db.prepare(`
    SELECT
      c.*,
      ct.abbreviation_prefix,
      ct.can_contain_parts,
      ct.description as type_description
    FROM containers c
    JOIN container_types ct ON c.container_type = ct.type_name
    WHERE c.id = ?
  `).get(containerId);

  if (!container) return null;

  return {
    ...container,
    path: getContainerPath(db, containerId)
  };
}

/**
 * Get all parts in a container
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @returns {Array} Array of parts with quantities
 */
function getContainerParts(db, containerId) {
  return db.prepare(`
    SELECT
      cp.*,
      p.name as part_name,
      p.part_img_url,
      p.category_id
    FROM container_parts cp
    JOIN parts p ON cp.part_num = p.part_num
    WHERE cp.container_id = ?
    ORDER BY p.name
  `).all(containerId);
}

/**
 * Get all child containers
 * @param {Database} db - SQLite database instance
 * @param {number} parentId - Parent container ID (null for root containers)
 * @returns {Array} Array of child containers
 */
function getChildContainers(db, parentId) {
  const query = parentId === null
    ? `SELECT c.*, ct.abbreviation_prefix, ct.can_contain_parts
       FROM containers c
       JOIN container_types ct ON c.container_type = ct.type_name
       WHERE c.parent_id IS NULL
       ORDER BY c.container_id`
    : `SELECT c.*, ct.abbreviation_prefix, ct.can_contain_parts
       FROM containers c
       JOIN container_types ct ON c.container_type = ct.type_name
       WHERE c.parent_id = ?
       ORDER BY c.container_id`;

  const containers = parentId === null
    ? db.prepare(query).all()
    : db.prepare(query).all(parentId);

  // Add paths to each container
  return containers.map(container => ({
    ...container,
    path: getContainerPath(db, container.id)
  }));
}

/**
 * Check if a container can contain parts based on its type
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @returns {boolean} True if container can contain parts
 */
function canContainerHoldParts(db, containerId) {
  const result = db.prepare(`
    SELECT ct.can_contain_parts
    FROM containers c
    JOIN container_types ct ON c.container_type = ct.type_name
    WHERE c.id = ?
  `).get(containerId);

  return result ? result.can_contain_parts === 1 : false;
}

/**
 * Get all locations where a part is stored
 * @param {Database} db - SQLite database instance
 * @param {string} partNum - Part number
 * @returns {Array} Array of locations with paths and quantities
 */
function getPartLocations(db, partNum) {
  const locations = db.prepare(`
    SELECT
      cp.*,
      c.container_id,
      c.container_type,
      c.description as container_description
    FROM container_parts cp
    JOIN containers c ON cp.container_id = c.id
    WHERE cp.part_num = ?
  `).all(partNum);

  return locations.map(location => ({
    ...location,
    path: getContainerPath(db, location.container_id)
  }));
}

/**
 * Validate that a container hierarchy is valid
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @param {number} newParentId - New parent ID (can be null)
 * @returns {Object} {valid: boolean, error: string}
 */
function validateContainerHierarchy(db, containerId, newParentId) {
  // Can't be its own parent
  if (containerId === newParentId) {
    return { valid: false, error: 'Container cannot be its own parent' };
  }

  // Check for circular reference
  let currentId = newParentId;
  while (currentId !== null) {
    if (currentId === containerId) {
      return { valid: false, error: 'Circular reference detected' };
    }

    const parent = db.prepare(`
      SELECT parent_id FROM containers WHERE id = ?
    `).get(currentId);

    if (!parent) break;
    currentId = parent.parent_id;
  }

  return { valid: true };
}

/**
 * Get all container types
 * @param {Database} db - SQLite database instance
 * @returns {Array} Array of container types
 */
function getContainerTypes(db) {
  return db.prepare(`
    SELECT * FROM container_types
    ORDER BY type_name
  `).all();
}

/**
 * Count parts and child containers
 * @param {Database} db - SQLite database instance
 * @param {number} containerId - Container ID
 * @returns {Object} {partCount, childCount}
 */
function getContainerStats(db, containerId) {
  const partCount = db.prepare(`
    SELECT COUNT(*) as count FROM container_parts WHERE container_id = ?
  `).get(containerId).count;

  const childCount = db.prepare(`
    SELECT COUNT(*) as count FROM containers WHERE parent_id = ?
  `).get(containerId).count;

  return { partCount, childCount };
}

module.exports = {
  getContainerPath,
  getContainerDetails,
  getContainerParts,
  getChildContainers,
  canContainerHoldParts,
  getPartLocations,
  validateContainerHierarchy,
  getContainerTypes,
  getContainerStats
};

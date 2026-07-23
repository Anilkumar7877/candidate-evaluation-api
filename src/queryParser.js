const AppError = require('./middleware/AppError');

const NUMERIC_FIELDS = [
  'assignment_score',
  'video_score',
  'ats_score',
  'github_score',
  'communication_score',
  'priority_score',
];

const TEXT_FIELDS = ['status', 'priority_bucket', 'college', 'name'];
const FILTERABLE_FIELDS = [...NUMERIC_FIELDS, ...TEXT_FIELDS];
const SORTABLE_FIELDS = [...NUMERIC_FIELDS, 'name', 'college', 'created_at'];
const RESERVED_PARAMS = new Set(['page', 'limit', 'sort', 'order', 'sort_by']);

const OPERATOR_TO_SQL = {
  '>=': '>=',
  '<=': '<=',
  '!=': '!=',
  '>': '>',
  '<': '<',
  '=': '=',
};

// Supports two query styles:
//   /candidates?assignment_score>70          (operator embedded in the key)
//   /candidates?status=shortlisted            (plain equality, express-parsed)
function parseFilters(req) {
  const clauses = [];
  const params = [];

  // Style 1: operator embedded directly in the raw query string, e.g. "assignment_score>70".
  // Express's query parser has nothing to split these on, so they show up as a key with an
  // empty string value. We re-parse the raw query string ourselves to catch them.
  const rawQuery = req.originalUrl.split('?')[1] || '';
  for (const part of rawQuery.split('&')) {
    if (!part) continue;
    const decoded = decodeURIComponent(part);
    const match = decoded.match(/^([a-zA-Z_]+)(>=|<=|!=|>|<)(.+)$/);
    if (!match) continue;
    const [, field, op, rawValue] = match;
    if (!FILTERABLE_FIELDS.includes(field)) {
      throw new AppError(400, 'INVALID_FILTER', `"${field}" is not a filterable field.`, {
        allowed: FILTERABLE_FIELDS,
      });
    }
    if (NUMERIC_FIELDS.includes(field)) {
      const value = Number(rawValue);
      if (Number.isNaN(value)) {
        throw new AppError(400, 'INVALID_FILTER', `"${field}${op}${rawValue}" has a non-numeric value.`);
      }
      clauses.push(`${field} ${OPERATOR_TO_SQL[op]} ?`);
      params.push(value);
    } else {
      clauses.push(`${field} ${OPERATOR_TO_SQL[op]} ?`);
      params.push(rawValue);
    }
  }

  // Style 2: plain "field=value" equality, already parsed into req.query by express.
  for (const [key, value] of Object.entries(req.query)) {
    if (RESERVED_PARAMS.has(key)) continue;
    if (value === '' || value === undefined) continue; // already handled above, or noise
    if (!FILTERABLE_FIELDS.includes(key)) {
      throw new AppError(400, 'INVALID_FILTER', `"${key}" is not a filterable field.`, {
        allowed: FILTERABLE_FIELDS,
      });
    }
    if (NUMERIC_FIELDS.includes(key)) {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new AppError(400, 'INVALID_FILTER', `"${key}" must be numeric, got "${value}".`);
      }
      clauses.push(`${key} = ?`);
      params.push(num);
    } else if (key === 'name' || key === 'college') {
      clauses.push(`${key} LIKE ?`);
      params.push(`%${value}%`);
    } else {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function parseSort(req) {
  const raw = req.query.sort || req.query.sort_by || 'created_at';
  let field = raw;
  let direction = (req.query.order || 'asc').toLowerCase();

  if (raw.includes(':')) {
    [field, direction] = raw.split(':');
    direction = (direction || 'asc').toLowerCase();
  }

  if (!SORTABLE_FIELDS.includes(field)) {
    throw new AppError(400, 'INVALID_SORT', `"${field}" is not a sortable field.`, {
      allowed: SORTABLE_FIELDS,
    });
  }
  if (!['asc', 'desc'].includes(direction)) {
    throw new AppError(400, 'INVALID_SORT', `order must be "asc" or "desc", got "${direction}".`);
  }

  return `ORDER BY ${field} ${direction.toUpperCase()}`;
}

function parsePagination(req) {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);

  if (page < 1) throw new AppError(400, 'INVALID_PAGINATION', 'page must be 1 or greater.');
  if (limit < 1) throw new AppError(400, 'INVALID_PAGINATION', 'limit must be 1 or greater.');

  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { parseFilters, parseSort, parsePagination, FILTERABLE_FIELDS, SORTABLE_FIELDS };

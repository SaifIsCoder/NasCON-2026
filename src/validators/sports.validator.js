'use strict';

/**
 * Sport Setup Validator (Section 5.6)
 * Validates a "mystery sport" definition purely from JSON and normalizes
 * it into the stored/echoed config. Accumulates every bad field so the
 * 400 VALIDATION_ERROR response lists them in details.fields.
 */

const { ApiError } = require('../utils/api-error');

const SCORING_MODELS = ['event', 'innings', 'round'];
const OVERTIME_POLICIES = ['none', 'extra_time', 'shootout', 'golden_score', 'super_over'];
const TIE_BREAK_TOKENS = ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'];
const SPORT_ID_RE = /^[a-z0-9_-]{2,40}$/;
const EVENT_KEY_RE = /^[a-z0-9_]{1,40}$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

class SportsValidator {
  static validateSport(body) {
    if (!isObject(body)) {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const fields = [];
    const {
      sport_id,
      name,
      scoring_model,
      periods,
      scoring_events,
      draw_allowed,
      overtime,
      tie_break_order,
      roster,
    } = body;

    if (typeof sport_id !== 'string' || !SPORT_ID_RE.test(sport_id)) fields.push('sport_id');
    if (typeof name !== 'string' || name.length < 1) fields.push('name');
    if (!SCORING_MODELS.includes(scoring_model)) fields.push('scoring_model');
    if (!isObject(periods)) fields.push('periods');
    if (!isObject(scoring_events) || Object.keys(scoring_events).length < 1) fields.push('scoring_events');
    if (typeof draw_allowed !== 'boolean') fields.push('draw_allowed');

    // overtime: required object; policy enum; optional duration_minutes int >= 0
    if (!isObject(overtime) || !OVERTIME_POLICIES.includes(overtime.policy)) {
      fields.push('overtime');
    } else if (overtime.duration_minutes !== undefined && (!isInt(overtime.duration_minutes) || overtime.duration_minutes < 0)) {
      fields.push('overtime');
    }

    // roster: required min/max (ints >= 1, min <= max), required_positions map
    if (!isObject(roster)) {
      fields.push('roster');
    } else {
      const { min_squad_size, max_squad_size, required_positions } = roster;
      let ok = isInt(min_squad_size) && min_squad_size >= 1 && isInt(max_squad_size) && max_squad_size >= 1 && min_squad_size <= max_squad_size;
      if (required_positions !== undefined) {
        if (!isObject(required_positions)) {
          ok = false;
        } else {
          for (const v of Object.values(required_positions)) {
            if (!isInt(v) || v < 0) ok = false;
          }
        }
      }
      if (!ok) fields.push('roster');
    }

    // Model-specific periods + scoring_events value shapes
    if (SCORING_MODELS.includes(scoring_model) && isObject(periods)) {
      if (!this.validatePeriods(scoring_model, periods)) fields.push('periods');
    }
    if (SCORING_MODELS.includes(scoring_model) && isObject(scoring_events) && Object.keys(scoring_events).length >= 1) {
      if (!this.validateScoringEvents(scoring_model, scoring_events)) fields.push('scoring_events');
    }

    // tie_break_order: optional, tokens from the allowed list with no repeats
    let normalizedTieBreak;
    if (tie_break_order === undefined) {
      normalizedTieBreak = [...TIE_BREAK_TOKENS];
    } else if (!Array.isArray(tie_break_order)) {
      fields.push('tie_break_order');
    } else {
      const seen = new Set();
      let ok = true;
      for (const t of tie_break_order) {
        if (!TIE_BREAK_TOKENS.includes(t) || seen.has(t)) ok = false;
        seen.add(t);
      }
      if (!ok) {
        fields.push('tie_break_order');
      } else {
        // draw_lots is always applied last even if omitted
        normalizedTieBreak = tie_break_order.filter((t) => t !== 'draw_lots');
        normalizedTieBreak.push('draw_lots');
      }
    }

    if (fields.length > 0) {
      throw ApiError.badRequest('One or more sport fields are invalid.', { fields: [...new Set(fields)] });
    }

    const config = {
      sport_id,
      name,
      scoring_model,
      periods,
      scoring_events,
      draw_allowed,
      overtime,
      tie_break_order: normalizedTieBreak,
      roster: {
        min_squad_size: roster.min_squad_size,
        max_squad_size: roster.max_squad_size,
        required_positions: roster.required_positions || {},
      },
    };

    return { sport_id, name, scoring_model, config };
  }

  static validatePeriods(model, periods) {
    if (model === 'event') {
      return isInt(periods.count) && periods.count >= 1 && isInt(periods.duration_minutes) && periods.duration_minutes >= 1;
    }
    if (model === 'innings') {
      return ['innings_per_team', 'overs_per_innings', 'balls_per_over', 'wickets_per_innings'].every(
        (k) => isInt(periods[k]) && periods[k] >= 1
      );
    }
    if (model === 'round') {
      return isInt(periods.best_of) && periods.best_of >= 1 && periods.best_of % 2 === 1;
    }
    return false;
  }

  static validateScoringEvents(model, events) {
    for (const [key, val] of Object.entries(events)) {
      if (!EVENT_KEY_RE.test(key) || !isObject(val)) return false;
      if (model === 'event') {
        if (!isInt(val.points) || val.points < 1) return false;
      } else if (model === 'innings') {
        if (!isInt(val.runs) || val.runs < 0) return false;
        if (typeof val.legal_ball !== 'boolean' || typeof val.wicket !== 'boolean') return false;
      } else if (model === 'round') {
        if (!isInt(val.rounds) || val.rounds < 1) return false;
      }
    }
    return true;
  }
}

module.exports = {
  SportsValidator,
  TIE_BREAK_TOKENS,
};

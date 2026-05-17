import { UomType } from "@prisma/client";

export interface CalculateResult {
  /**
   * The raw, uncapped progress percentage (e.g. 150 for 150%, or -50 for negative progress)
   */
  raw: number;
  /**
   * The progress percentage clamped between 0% and 100%
   */
  clamped: number;
}

export interface GoalProgressInput {
  uomType: UomType;
  target: number;
  achievementValue: number;
  weightage: number;
}

export class ProgressCalculator {
  /**
   * Calculates progress for a single goal
   * @param uomType Type of the unit of measure (NUMERIC_MAX, NUMERIC_MIN, TIMELINE, ZERO_BASED)
   * @param target Target value
   * @param achievement Current achievement value
   * @returns An object containing raw and clamped progress percentages
   */
  static calculate(uomType: UomType, target: number, achievement: number): CalculateResult {
    // If target or achievement are null/undefined, treat progress as 0
    if (
      target === null ||
      target === undefined ||
      achievement === null ||
      achievement === undefined
    ) {
      return { raw: 0, clamped: 0 };
    }

    let raw = 0;

    switch (uomType) {
      case UomType.NUMERIC_MAX:
        if (target <= 0) {
          // If target is 0 or less, achieving greater than or equal to target is 100%, else 0%
          raw = achievement >= target ? 100 : 0;
        } else {
          raw = (achievement / target) * 100;
        }
        break;

      case UomType.NUMERIC_MIN:
        if (target <= 0) {
          // If target is 0 or less, achieving less than or equal to target is 100%, else 0%
          raw = achievement <= target ? 100 : 0;
        } else {
          // Linear formula: 100 + ((target - achievement) / target) * 100
          // If achievement is better than target (less), progress exceeds 100%
          // If achievement is worse than target (more), progress is below 100% and can reach 0% or negative
          raw = 100 + ((target - achievement) / target) * 100;
        }
        break;

      case UomType.ZERO_BASED:
        // Binary/Event based. Typically 1 is target (complete) and 0 is not.
        // If achievement meets or exceeds target, progress is 100%, else 0%
        raw = achievement >= target ? 100 : 0;
        break;

      case UomType.TIMELINE:
        // Timeline deadlines: earlier or fewer days is better, behaving exactly like NUMERIC_MIN
        if (target <= 0) {
          raw = achievement <= target ? 100 : 0;
        } else {
          raw = 100 + ((target - achievement) / target) * 100;
        }
        break;

      default:
        raw = 0;
    }

    // Safeguard against NaN, Infinity, or -Infinity
    if (isNaN(raw) || !isFinite(raw)) {
      raw = 0;
    }

    // Clamp progress between 0 and 100
    const clamped = Math.min(100, Math.max(0, raw));

    return {
      raw: Math.round(raw * 100) / 100, // Round to 2 decimal places
      clamped: Math.round(clamped * 100) / 100,
    };
  }

  /**
   * Calculates overall weighted progress for a list of goals
   * @param goals Array of goals containing their UoM type, target, achievement value, and weightage
   * @returns Weighted progress percentage as a number rounded to 2 decimal places
   */
  static calculateWeightedProgress(goals: GoalProgressInput[]): number {
    if (!goals || goals.length === 0) return 0;

    let totalWeight = 0;
    let totalWeightedProgress = 0;

    for (const goal of goals) {
      const { clamped } = this.calculate(goal.uomType, goal.target, goal.achievementValue);
      totalWeightedProgress += clamped * (goal.weightage / 100);
      totalWeight += goal.weightage;
    }

    if (totalWeight === 0) return 0;

    // Normalize weighted progress against the total weightage (handles cases where weightage doesn't sum to 100%)
    const normalizedProgress = (totalWeightedProgress / (totalWeight / 100));
    
    // Safeguard against NaN or Infinity
    if (isNaN(normalizedProgress) || !isFinite(normalizedProgress)) {
      return 0;
    }

    return Math.round(normalizedProgress * 100) / 100;
  }
}

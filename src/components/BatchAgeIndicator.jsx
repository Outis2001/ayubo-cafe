/**
 * Batch Age Indicator Component
 * Displays a color-coded badge showing the age of an inventory batch
 */

import { getBatchAgeColors } from '../utils/batchTracking';

/**
 * BatchAgeIndicator Component
 * @param {Object} props
 * @param {number} props.age - Age of the batch in days
 */
const BatchAgeIndicator = ({ age }) => {
  const colors = getBatchAgeColors(age);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.bg}`}>
      <div className={`w-2 h-2 rounded-full ${colors.badge}`}></div>
      <span className={`text-xs font-bold ${colors.text}`}>
        Day {age}
      </span>
    </div>
  );
};

export default BatchAgeIndicator;


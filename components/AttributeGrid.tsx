import AttributeCard from './AttributeCard';
import type { PropertyConfig, TrackerType } from '@/lib/types';
import { ALL_TRACKER_TYPES } from '@/lib/trackers';

interface Props {
  cfg: PropertyConfig;
  onUpdate: (type: TrackerType) => void;
}

export default function AttributeGrid({ cfg, onUpdate }: Props) {
  return (
    <div className="attribute-grid">
      {ALL_TRACKER_TYPES.map(type => (
        <AttributeCard
          key={type}
          cfg={cfg}
          type={type}
          onUpdate={() => onUpdate(type)}
          // The rent agreement card sits alone on the top row, spanning the grid.
          style={type === 'lease' ? { gridColumn: '1 / -1' } : undefined}
        />
      ))}
    </div>
  );
}

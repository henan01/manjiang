import { getTileDisplay, getTileClass } from '../utils/tile';
import './Tile.css';

function Tile({ tile, onClick, selected, disabled }) {
  if (!tile) return null;

  return (
    <div
      className={`tile ${getTileClass(tile)} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onClick && onClick(tile)}
    >
      {getTileDisplay(tile)}
    </div>
  );
}

export default Tile;

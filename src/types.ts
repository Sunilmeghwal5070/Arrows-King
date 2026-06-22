/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type AnimationState =
  | { type: 'idle' }
  | { type: 'escaping'; progress: number; speed: number } // progress from 0 to 1+
  | { type: 'bumping'; progress: number; crashPoint: Point; targetPoint: Point; crashDistance?: number }; // progress 0 -> 0.5 (slide to hit) -> 0 (recoil)

export interface ArrowPath {
  id: string;
  // Sequence of grid coordinates (e.g. integer values).
  // The path starts from points[0] and ends at points[points.length - 1], where the arrowhead is placed.
  points: Point[];
  // Direction of the arrowhead escaping at the end. 'U' | 'D' | 'L' | 'R'
  exitDirection: 'U' | 'D' | 'L' | 'R';
  // State for visual updates and animations.
  animState: AnimationState;
  // Original color or highlighted state.
  isHint?: boolean;
  // Indicates if the arrow has bumped/failed in the current attempt
  hasFailed?: boolean;
}

export interface LevelConfig {
  levelNumber: number;
  title: string;
  difficulty: 'Normal' | 'Medium' | 'Hard';
  // Grid size, e.g. 6x8, 8x10
  gridWidth: number;
  gridHeight: number;
  // Maximum moves allowed.
  maxMoves: number;
  // Standard arrows layout
  paths: ArrowPath[];
}

export type GameScreen = 'MENU' | 'GAMEPLAY' | 'DAILY_SCREEN' | 'PROFILE_SCREEN' | 'SETTINGS';

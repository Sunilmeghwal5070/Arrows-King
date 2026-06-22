/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point, ArrowPath } from '../types';

/**
 * Returns whether a point is approximately on a line segment.
 */
export function isPointOnSegment(p: Point, s1: Point, s2: Point, tolerance = 0.01): boolean {
  const minX = Math.min(s1.x, s2.x) - tolerance;
  const maxX = Math.max(s1.x, s2.x) + tolerance;
  const minY = Math.min(s1.y, s2.y) - tolerance;
  const maxY = Math.max(s1.y, s2.y) + tolerance;

  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
    return false;
  }

  // If vertical
  if (Math.abs(s1.x - s2.x) < tolerance) {
    return Math.abs(p.x - s1.x) < tolerance;
  }
  // If horizontal
  if (Math.abs(s1.y - s2.y) < tolerance) {
    return Math.abs(p.y - s1.y) < tolerance;
  }

  // General line distance
  const d = Math.abs((s2.y - s1.y) * p.x - (s2.x - s1.x) * p.y + s2.x * s1.y - s2.y * s1.x) /
    Math.sqrt(Math.pow(s2.y - s1.y, 2) + Math.pow(s2.x - s1.x, 2));
  return d < tolerance;
}

/**
 * Finds the intersection between two orthogonal (horizontal or vertical) segments.
 * Returns the intersection Point, or null if they don't intersect.
 */
export function getSegmentsIntersection(
  s1_start: Point,
  s1_end: Point,
  s2_start: Point,
  s2_end: Point,
  tolerance = 0.01
): Point | null {
  const isS1Horiz = Math.abs(s1_start.y - s1_end.y) < 0.001;
  const isS2Horiz = Math.abs(s2_start.y - s2_end.y) < 0.001;

  const minX1 = Math.min(s1_start.x, s1_end.x);
  const maxX1 = Math.max(s1_start.x, s1_end.x);
  const minY1 = Math.min(s1_start.y, s1_end.y);
  const maxY1 = Math.max(s1_start.y, s1_end.y);

  const minX2 = Math.min(s2_start.x, s2_end.x);
  const maxX2 = Math.max(s2_start.x, s2_end.x);
  const minY2 = Math.min(s2_start.y, s2_end.y);
  const maxY2 = Math.max(s2_start.y, s2_end.y);

  if (isS1Horiz && isS2Horiz) {
    // Both horizontal
    if (Math.abs(s1_start.y - s2_start.y) > tolerance) return null;
    const overlapMin = Math.max(minX1, minX2);
    const overlapMax = Math.min(maxX1, maxX2);
    if (overlapMin <= overlapMax + tolerance) {
      // Return middle of overlap
      return { x: (overlapMin + overlapMax) / 2, y: s1_start.y };
    }
    return null;
  } else if (!isS1Horiz && !isS2Horiz) {
    // Both vertical
    if (Math.abs(s1_start.x - s2_start.x) > tolerance) return null;
    const overlapMin = Math.max(minY1, minY2);
    const overlapMax = Math.min(maxY1, maxY2);
    if (overlapMin <= overlapMax + tolerance) {
      return { x: s1_start.x, y: (overlapMin + overlapMax) / 2 };
    }
    return null;
  } else {
    // One horizontal, one vertical
    const H_y = isS1Horiz ? s1_start.y : s2_start.y;
    const H_minX = isS1Horiz ? minX1 : minX2;
    const H_maxX = isS1Horiz ? maxX1 : maxX2;

    const V_x = isS1Horiz ? s2_start.x : s1_start.x;
    const V_minY = isS1Horiz ? minY2 : minY1;
    const V_maxY = isS1Horiz ? maxY2 : maxY1;

    if (V_x >= H_minX - tolerance && V_x <= H_maxX + tolerance &&
        H_y >= V_minY - tolerance && H_y <= V_maxY + tolerance) {
      return { x: V_x, y: H_y };
    }
    return null;
  }
}

/**
 * Computes the complete track segments of an arrow, including its escape ray.
 * The ray continues off-screen based on grid bounds.
 */
export function getArrowTrack(arrow: ArrowPath, gridWidth: number, gridHeight: number): { segments: [Point, Point][]; totalLength: number } {
  const segments: [Point, Point][] = [];
  let totalLength = 0;

  // Add path's original segments
  for (let i = 0; i < arrow.points.length - 1; i++) {
    const p1 = arrow.points[i];
    const p2 = arrow.points[i + 1];
    segments.push([p1, p2]);
    totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // Add the final exiting ray from the arrowhead point
  const headPoint = arrow.points[arrow.points.length - 1];
  let exitEnd: Point;
  const borderMargin = 15; // travel far beyond the grid container to vanish

  switch (arrow.exitDirection) {
    case 'U':
      exitEnd = { x: headPoint.x, y: -borderMargin };
      break;
    case 'D':
      exitEnd = { x: headPoint.x, y: gridHeight + borderMargin };
      break;
    case 'L':
      exitEnd = { x: -borderMargin, y: headPoint.y };
      break;
    case 'R':
      exitEnd = { x: gridWidth + borderMargin, y: headPoint.y };
      break;
  }

  segments.push([headPoint, exitEnd]);
  totalLength += Math.sqrt(Math.pow(exitEnd.x - headPoint.x, 2) + Math.pow(exitEnd.y - headPoint.y, 2));

  return { segments, totalLength };
}

/**
 * Holds collision result details.
 */
export interface CollisionResult {
  isBlocked: boolean;
  blockingArrowId: string | null;
  // Point along the track where the collision occurs
  crashPoint: Point | null;
  // How far along the track length the crash happened
  crashDistance: number | null;
}

/**
 * Checks if a specific arrow is blocked by any other remaining arrows on the board.
 * Returns the first collision (closest to the arrow's start).
 */
export function checkCollision(
  arrow: ArrowPath,
  allArrows: ArrowPath[],
  gridWidth: number,
  gridHeight: number
): CollisionResult {
  const headPoint = arrow.points[arrow.points.length - 1];
  let exitEnd: Point;
  const borderMargin = 15;

  let rayStart: Point = { ...headPoint };
  const step = 0.05; // slightly forward to avoid shared vertex false collisions

  switch (arrow.exitDirection) {
    case 'U':
      exitEnd = { x: headPoint.x, y: -borderMargin };
      rayStart.y -= step;
      break;
    case 'D':
      exitEnd = { x: headPoint.x, y: gridHeight + borderMargin };
      rayStart.y += step;
      break;
    case 'L':
      exitEnd = { x: -borderMargin, y: headPoint.y };
      rayStart.x -= step;
      break;
    case 'R':
      exitEnd = { x: gridWidth + borderMargin, y: headPoint.y };
      rayStart.x += step;
      break;
  }

  const otherArrows = allArrows.filter((a) => a.id !== arrow.id && a.animState.type !== 'escaping');

  let closestCrashPoint: Point | null = null;
  let closestCrashDistance = Infinity;
  let blockingArrowId: string | null = null;

  for (const other of otherArrows) {
    for (let j = 0; j < other.points.length - 1; j++) {
      const o1 = other.points[j];
      const o2 = other.points[j + 1];

      // Find intersection of our advanced exit ray with other's active path segment
      const intersect = getSegmentsIntersection(rayStart, exitEnd, o1, o2);

      if (intersect) {
        // Distance along the exit ray from the mouth of our original arrowhead
        const dFromHead = Math.sqrt(Math.pow(intersect.x - headPoint.x, 2) + Math.pow(intersect.y - headPoint.y, 2));

        if (dFromHead < closestCrashDistance) {
          closestCrashDistance = dFromHead;
          closestCrashPoint = intersect;
          blockingArrowId = other.id;
        }
      }
    }
  }

  if (closestCrashPoint !== null) {
    return {
      isBlocked: true,
      blockingArrowId,
      crashPoint: closestCrashPoint,
      crashDistance: closestCrashDistance,
    };
  }

  return {
    isBlocked: false,
    blockingArrowId: null,
    crashPoint: null,
    crashDistance: null,
  };
}

/**
 * Interpolates coordinates along a polyline to draw/animate a flowing path.
 * We want to slide the path "snake-style" forward by shiftDist.
 */
export function interpolateSectionPoints(
  originalPoints: Point[],
  exitDirection: 'U' | 'D' | 'L' | 'R',
  gridWidth: number,
  gridHeight: number,
  shiftDist: number
): Point[] {
  // First, construct the extended points array including exit ray
  const headPoint = originalPoints[originalPoints.length - 1];
  const borderMargin = 15;
  let exitEnd: Point;

  switch (exitDirection) {
    case 'U': exitEnd = { x: headPoint.x, y: -borderMargin }; break;
    case 'D': exitEnd = { x: headPoint.x, y: gridHeight + borderMargin }; break;
    case 'L': exitEnd = { x: -borderMargin, y: headPoint.y }; break;
    case 'R': exitEnd = { x: gridWidth + borderMargin, y: headPoint.y }; break;
  }

  const allPoints = [...originalPoints, exitEnd];

  // We want to slice the track from shiftDist to shiftDist + originalLength
  // Calculate segments lengths
  const segsLen: number[] = [];
  let originalLength = 0;
  for (let i = 0; i < originalPoints.length - 1; i++) {
    const l = Math.sqrt(Math.pow(originalPoints[i+1].x - originalPoints[i].x, 2) + Math.pow(originalPoints[i+1].y - originalPoints[i].y, 2));
    originalLength += l;
  }

  const startT = shiftDist;
  const endT = shiftDist + originalLength;

  return getExtractedSubsegment(allPoints, startT, endT);
}

/**
 * Extracts a subsegment of a polyline given global distances from the start.
 */
function getExtractedSubsegment(poly: Point[], startDist: number, endDist: number): Point[] {
  const result: Point[] = [];
  let distanceSum = 0;

  let addedStart = false;

  for (let i = 0; i < poly.length - 1; i++) {
    const p1 = poly[i];
    const p2 = poly[i + 1];
    const segLen = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const nextSum = distanceSum + segLen;

    // Check if startDist falls on this segment
    if (!addedStart && startDist >= distanceSum && startDist <= nextSum) {
      const ratio = segLen > 0 ? (startDist - distanceSum) / segLen : 0;
      const startPoint = {
        x: p1.x + ratio * (p2.x - p1.x),
        y: p1.y + ratio * (p2.y - p1.y),
      };
      result.push(startPoint);
      addedStart = true;
    }

    // Include original intermediate points if they are within [startDist, endDist]
    if (addedStart) {
      if (distanceSum > startDist && distanceSum < endDist) {
        result.push(p1);
      }
    }

    // Check if endDist falls on this segment
    if (endDist >= distanceSum && endDist <= nextSum) {
      const ratio = segLen > 0 ? (endDist - distanceSum) / segLen : 0;
      const endPoint = {
        x: p1.x + ratio * (p2.x - p1.x),
        y: p1.y + ratio * (p2.y - p1.y),
      };
      result.push(endPoint);
      break;
    }

    distanceSum = nextSum;
  }

  return result;
}

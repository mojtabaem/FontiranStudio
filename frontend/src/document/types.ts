export type Tool = 'move' | 'hand' | 'text' | 'path';

export interface Point {
  x: number;
  y: number;
}

export interface PathPoint {
  anchor: Point;
  handleIn: Point; // relative to anchor
  handleOut: Point;
}

export interface Subpath {
  closed: boolean;
  points: PathPoint[];
}

export interface Appearance {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface BaseObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  appearance: Appearance;
}

export interface TextObject extends BaseObject {
  type: 'text';
  text: string;
  fontFamilyId: string;
  fontFaceId: string;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  variableAxes: Record<string, number>;
  features: Record<string, boolean>; // tag -> enabled
}

export interface ShapeObject extends BaseObject {
  type: 'shape';
  subpaths: Subpath[];
}

export type CanvasObject = TextObject | ShapeObject;

export interface DocumentModel {
  version: 1;
  objects: Record<string, CanvasObject>;
  order: string[]; // z-order bottom to top
  updatedAt: number | null;
}

export const CANVAS_WIDTH = 4000;
export const CANVAS_HEIGHT = 2000;
export const MAX_LAYERS = 7;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

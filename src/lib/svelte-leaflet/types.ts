import type { Control, Layer, LayerGroup, Map, Marker, Popup, TileLayer } from 'leaflet';

export type MapInstance = Control | Map | Marker | Popup | TileLayer;

export type LeafletContextInterface = Readonly<{
	getMap: () => Map | undefined;
	getLayer?: () => LayerGroup | undefined;
	getControl?: () => Control.Layers | undefined;
	getOverlay?: () => Layer | Marker | undefined;
	// pane?: string;
}>;

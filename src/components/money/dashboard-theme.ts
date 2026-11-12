// AG Studio in Leash's V2 design: paper canvas, white cards with a hairline edge, ink text,
// Leash blue for anything you can click, and the stamp colours for money.

import { studioTheme } from "ag-studio";
import { OUTCOME_COLOR } from "@/lib/labels";

// The tokens from globals.css. Charts draw on a canvas, which can't read CSS variables.
const PAPER = "#f7f5f0";
const INK = "#14130f";
const INK_SOFT = "#6b675e";
const HAIRLINE = "#e4e0d6";
const LEASH = "#1552f0";
const LEASH_WASH = "#eaf0ff";
/** The stamps' text colours, for the big numbers. */
export const STAMP_INK = { paid: "#18733f", reserved: "#8f5d12", blocked: INK, refunded: "#2563c9" };
export const SANS = 'Geist, "Geist Fallback", sans-serif';
export const MONO = '"Geist Mono", "Geist Mono Fallback", monospace';

/**
 * Charts colour each series by its place in this list, so every money chart lists its series in
 * this order: paid (green), waiting for you (amber), stopped by your leash (ink), refunded (blue).
 */
const PALETTE = [
  OUTCOME_COLOR.approved,
  OUTCOME_COLOR.held,
  OUTCOME_COLOR.blocked,
  OUTCOME_COLOR.refunded,
  OUTCOME_COLOR.failed,
  LEASH,
  OUTCOME_COLOR.denied,
];
const palette = Object.fromEntries(
  PALETTE.flatMap((color, index) => [
    [`chartPaletteFills${index + 1}Color`, color],
    [`chartPaletteStrokes${index + 1}Color`, color],
  ]),
);

const line = (color: string) => ({ width: 1, color });

export const dashboardTheme = studioTheme.withParams({
  fontFamily: SANS,
  fontSize: 14,
  textColor: INK,
  foregroundColor: INK,
  subtleTextColor: INK_SOFT,
  backgroundColor: "#ffffff",
  borderColor: HAIRLINE,
  accentColor: LEASH,
  rowHoverColor: PAPER,

  // No frame: the canvas is the page itself, and phones can go down to 320 px.
  studioWrapperBorder: false,
  studioWrapperBorderRadius: 0,
  studioWrapperSpacing: 0,
  studioWrapperBackgroundColor: PAPER,
  studioCanvasBackgroundColor: PAPER,
  studioCanvasBorder: false,
  studioCanvasBorderRadius: 0,
  studioCanvasShadow: false,
  studioCanvasPadding: 0,
  studioCanvasMinWidth: 320,
  studioCanvasRowHeight: 18,
  studioCanvasFontFamily: SANS,

  // Widgets are the app's cards: white, a hairline edge, round corners.
  studioWidgetBackgroundColor: "#ffffff",
  studioWidgetBorder: line(HAIRLINE),
  studioWidgetBorderRadius: 20,
  studioWidgetPadding: 16,
  studioWidgetTitleFontFamily: SANS,
  studioWidgetTitleFontSize: 16,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: INK,
  studioWidgetSubtitleFontFamily: SANS,
  studioWidgetSubtitleFontSize: 13,
  studioWidgetSubtitleTextColor: INK_SOFT,
  studioWidgetResizeBorderColor: LEASH,

  // Edit mode's panels.
  studioPanelContainerBackgroundColor: "#ffffff",
  studioPanelContainerBorder: line(HAIRLINE),
  studioPanelDividerColor: HAIRLINE,
  studioPanelDividerActiveColor: LEASH,
  studioToggleButtonActiveBackgroundColor: LEASH_WASH,
  studioToggleButtonActiveBorderColor: LEASH,
  studioToggleButtonActiveColor: LEASH,

  // The table: quiet headers, hairline rows.
  gridFontFamily: SANS,
  gridFontSize: 14,
  gridCellTextColor: INK,
  gridHeaderBackgroundColor: "#ffffff",
  gridHeaderTextColor: INK_SOFT,
  gridHeaderFontWeight: 500,
  gridRowHeight: 40,
  gridRowBorder: line(HAIRLINE),
  gridHeaderRowBorder: line(HAIRLINE),
  gridRowHoverColor: PAPER,
  gridWrapperBorder: false,

  chartFontFamily: SANS,
  chartTextColor: INK,
  chartSubtleTextColor: INK_SOFT,
  chartAxisLineColor: HAIRLINE,
  chartGridLineColor: HAIRLINE,
  chartLegendItemHorizontalPadding: 8,
  chartLegendMarkerSize: 12,
  ...palette,
});

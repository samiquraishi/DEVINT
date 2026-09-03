import { Gallery, type GalleryProps, type StreamProgressInfo, GALLERY_DEFAULTS } from "./Gallery";
import type { NumberedCardData } from "./cardTextures";

export type SceneProps = Omit<GalleryProps, "onPanelClick"> & {
  backgroundTheme?: 'white';
  onPanelClick?: (card: NumberedCardData) => void;
  onProgressChange?: (info: StreamProgressInfo) => void;
  resetTrigger?: number;
  stepNextTrigger?: number;
  stepPrevTrigger?: number;
  scrollProgress?: number;
  renderHalf?: 'front' | 'back' | 'all';
};

export function Scene({
  speed = GALLERY_DEFAULTS.speed,
  damping = GALLERY_DEFAULTS.damping,
  translucency = GALLERY_DEFAULTS.translucency,
  parallax = GALLERY_DEFAULTS.parallax,
  cylinderParallax = GALLERY_DEFAULTS.cylinderParallax,
  cardDepth = GALLERY_DEFAULTS.cardDepth,
  cycles = GALLERY_DEFAULTS.cycles,
  autoScroll = GALLERY_DEFAULTS.autoScroll,
  scale = GALLERY_DEFAULTS.scale,
  opacity = GALLERY_DEFAULTS.opacity,
  saturation = GALLERY_DEFAULTS.saturation,
  brightness = GALLERY_DEFAULTS.brightness,
  wireframe,
  onPanelClick,
  onProgressChange,
  resetTrigger,
  stepNextTrigger,
  stepPrevTrigger,
  scrollProgress,
  renderHalf = 'all',
}: SceneProps) {
  return (
    <div id="scene-wrapper" className="shader-frame">
      <Gallery
        speed={speed}
        damping={damping}
        translucency={translucency}
        parallax={parallax}
        cylinderParallax={cylinderParallax}
        cardDepth={cardDepth}
        cycles={cycles}
        autoScroll={autoScroll}
        scale={scale}
        opacity={opacity}
        saturation={saturation}
        brightness={brightness}
        wireframe={wireframe}
        onPanelClick={onPanelClick}
        onProgressChange={onProgressChange}
        resetTrigger={resetTrigger}
        stepNextTrigger={stepNextTrigger}
        stepPrevTrigger={stepPrevTrigger}
        scrollProgress={scrollProgress}
        renderHalf={renderHalf}
      />
    </div>
  );
}



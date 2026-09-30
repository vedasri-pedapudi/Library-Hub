// The cinematic hero animation (unchanged). Pure CSS keyframes — see styles.css.
import libraryHall from "@/assets/library-hall.jpg";
import closedBook from "@/assets/closed-book.png";
import openBook from "@/assets/open-book.png";

export function LibraryScene({ sequence }: { sequence: number }) {
  return (
    <div className="library-scene" key={sequence} aria-hidden="true">
      <img className="library-backdrop" src={libraryHall} width={1920} height={1080} alt="" />
      <div className="library-vignette" />
      <div className="library-stage">
        <img className="float-book float-one" src={openBook} width={1024} height={1024} alt="" />
        <img className="float-book float-two" src={closedBook} width={1024} height={1024} alt="" />
        <img className="float-book float-three" src={openBook} width={1024} height={1024} alt="" />
        <img className="float-book float-four" src={closedBook} width={1024} height={1024} alt="" />
        <div className="book-glow" />
        <div className="story-book">
          <div className="book-closed"><img src={closedBook} width={1024} height={1024} alt="" /></div>
          <div className="book-open">
            <img src={openBook} width={1024} height={1024} alt="" />
          </div>
        </div>
        <div className="sparkle-ring" />
      </div>
      <div className="dust-field" />
    </div>
  );
}

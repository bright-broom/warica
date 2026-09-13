import { Smile, Sparkles, Heart } from 'lucide-react';

export function PopWelcome() {
  return (
    <section className="pop-welcome" aria-label="みんなの、わりかん。">
      <div className="pop-welcome-copy">
        <p className="pop-eyebrow">みんなの、わりかん。</p>
        <p className="pop-headline">
          あつまる。
          <br />
          わけあう。
        </p>
      </div>
      <div className="pop-friends" aria-hidden="true">
        <Sparkles className="pop-spark" />
        <div className="pop-friend pop-friend-back">
          <Heart />
        </div>
        <div className="pop-friend pop-friend-front">
          <Smile />
        </div>
      </div>
    </section>
  );
}

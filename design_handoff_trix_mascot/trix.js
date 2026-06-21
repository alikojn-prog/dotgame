/* ============================================================
   Trix — the doTriangle mascot · self-contained component
   ------------------------------------------------------------
   Usage:
     <div id="trix-slot"></div>
     <script src="trix.js"></script>
     <script>
       var trix = Trix.mount(document.getElementById("trix-slot"));
       trix.setMood("battle");  // "idle" | "battle" | "happy" | "curious"
       trix.pulse();            // one-shot reactor burst
     </script>
   No dependencies. Injects its own <style> once. Multiple
   instances are fine — each gets unique gradient ids.
   ============================================================ */
(function () {
  "use strict";
  var STYLE_ID = "trix-style";
  var uid = 0;

  var CSS = [
    ".trix{display:block;width:100%;height:auto;overflow:visible;}",
    ".trix .float{animation:trixFloat 6.5s ease-in-out infinite;}",
    "@keyframes trixFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}",
    ".trix .head{transition:transform .35s cubic-bezier(.34,1.4,.5,1);transform-origin:50% 62%;transform-box:fill-box;}",
    ".trix.m-curious .head{transform:rotate(-6deg);}",
    ".trix .eye{transition:transform .3s cubic-bezier(.34,1.4,.5,1);transform-origin:center;transform-box:fill-box;}",
    ".trix.m-battle .eyeL{transform:rotate(15deg) scaleY(.72);}",
    ".trix.m-battle .eyeR{transform:rotate(-15deg) scaleY(.72);}",
    ".trix.m-happy .eye{transform:scaleY(.62) translateY(9px);}",
    ".trix.m-curious .eyeL{transform:scale(1.16);}",
    ".trix.m-curious .eyeR{transform:scale(.85);}",
    ".trix .brow,.trix .smile,.trix .blush,.trix .spark{opacity:0;transition:opacity .25s;}",
    ".trix.m-battle .brow{opacity:1;}",
    ".trix.m-happy .smile,.trix.m-happy .blush{opacity:1;}",
    ".trix.m-curious .spark{opacity:1;}",
    ".trix .reactor-line{transition:stroke .3s;}",
    ".trix .reactor-soft{transition:fill .3s;}",
    ".trix.m-battle .reactor-line{stroke:#FF5FB0;}",
    ".trix.m-battle .reactor-hi{stroke:#ffd2ea;}",
    ".trix.m-battle .reactor-soft{fill:#FF5FB0;}",
    ".trix .blinklid{opacity:0;animation:trixBlink 6.4s infinite;}",
    ".trix.m-battle .blinklid{animation:none;}",
    "@keyframes trixBlink{0%,93.5%,97.5%,100%{opacity:0}94.5%,96.5%{opacity:1}}",
    ".trix .reactor-burst{opacity:0;transform-origin:center;transform-box:fill-box;}",
    ".trix.pulsing .reactor-burst{animation:trixBurst .7s ease-out;}",
    "@keyframes trixBurst{0%{opacity:.85;transform:scale(.5)}100%{opacity:0;transform:scale(1.9)}}",
    "@media (prefers-reduced-motion:reduce){.trix .float,.trix .blinklid{animation:none!important}}"
  ].join("\n");

  function svgMarkup(s) {
    return '<svg class="trix m-idle" viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg" fill="none" role="img" aria-label="Trix, the doTriangle mascot">' +
    '<defs>' +
      '<linearGradient id="' + s + 'P" x1="100" y1="50" x2="280" y2="260" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#f6f2ff"/><stop offset="0.55" stop-color="#d9cff2"/><stop offset="1" stop-color="#a293d6"/></linearGradient>' +
      '<linearGradient id="' + s + 'PB" x1="150" y1="246" x2="220" y2="370" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#efe9ff"/><stop offset="1" stop-color="#a89ad8"/></linearGradient>' +
      '<linearGradient id="' + s + 'V" x1="180" y1="84" x2="180" y2="226" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#0a0724"/><stop offset="1" stop-color="#120e38"/></linearGradient>' +
      '<radialGradient id="' + s + 'E" cx="0.5" cy="0.45" r="0.6">' +
        '<stop offset="0" stop-color="#c5f8ff"/><stop offset="0.5" stop-color="#3ce0f2"/><stop offset="1" stop-color="#1f9fd6"/></radialGradient>' +
      '<radialGradient id="' + s + 'PC" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0" stop-color="#ffd2ea"/><stop offset="0.5" stop-color="#FF5FB0"/><stop offset="1" stop-color="#5e1c52"/></radialGradient>' +
      '<filter id="' + s + 'S" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<filter id="' + s + 'M" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="' + s + 'B" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="13"/></filter>' +
    '</defs>' +
    '<ellipse cx="180" cy="418" rx="116" ry="16" fill="#FF5FB0" opacity="0.22" filter="url(#' + s + 'B)"/>' +
    '<ellipse cx="180" cy="416" rx="64" ry="10" fill="#36E0E6" opacity="0.25" filter="url(#' + s + 'B)"/>' +
    '<g class="float">' +
      '<rect x="146" y="348" width="26" height="36" rx="11" fill="#1b1538"/>' +
      '<rect x="188" y="348" width="26" height="36" rx="11" fill="#1b1538"/>' +
      '<rect x="122" y="374" width="62" height="34" rx="17" fill="url(#' + s + 'PB)" stroke="#c9bfe8" stroke-opacity="0.4" stroke-width="1.5"/>' +
      '<rect x="176" y="374" width="62" height="34" rx="17" fill="url(#' + s + 'PB)" stroke="#c9bfe8" stroke-opacity="0.4" stroke-width="1.5"/>' +
      '<path d="M124 398 L182 398" stroke="#171132" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M178 398 L236 398" stroke="#171132" stroke-width="9" stroke-linecap="round"/>' +
      '<rect x="84" y="290" width="32" height="56" rx="15" fill="#1b1538" transform="rotate(16 100 318)"/>' +
      '<rect x="244" y="290" width="32" height="56" rx="15" fill="#1b1538" transform="rotate(-16 260 318)"/>' +
      '<circle cx="89" cy="350" r="17" fill="#241d4e"/><circle cx="271" cy="350" r="17" fill="#241d4e"/>' +
      '<path d="M80 344 Q88 338 98 344" stroke="#5e54a0" stroke-width="2" opacity="0.8"/>' +
      '<path d="M262 344 Q270 338 280 344" stroke="#5e54a0" stroke-width="2" opacity="0.8"/>' +
      '<circle cx="118" cy="284" r="17" fill="url(#' + s + 'PB)"/><circle cx="242" cy="284" r="17" fill="url(#' + s + 'PB)"/>' +
      '<rect x="128" y="244" width="104" height="116" rx="46" fill="url(#' + s + 'PB)" stroke="#c9bfe8" stroke-opacity="0.5" stroke-width="1.5"/>' +
      '<path d="M142 268 Q180 252 218 268" stroke="#ffffff" stroke-opacity="0.65" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M138 330 Q180 348 222 330" stroke="#8d7fc4" stroke-opacity="0.4" stroke-width="2"/>' +
      '<circle class="reactor-soft" cx="180" cy="302" r="26" fill="#36E0E6" opacity="0.16" filter="url(#' + s + 'M)"/>' +
      '<path d="M163 290 L197 290 L180 318 Z" fill="#0c1230"/>' +
      '<path class="reactor-line" d="M163 290 L197 290 L180 318 Z" stroke="#36E0E6" stroke-width="3" stroke-linejoin="round" filter="url(#' + s + 'S)"/>' +
      '<path class="reactor-hi" d="M163 290 L197 290 L180 318 Z" stroke="#9bf4ff" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle class="reactor-burst" cx="180" cy="302" r="30" fill="#FF5FB0" filter="url(#' + s + 'M)"/>' +
      '<rect x="160" y="228" width="40" height="22" rx="9" fill="#171132"/>' +
      '<g class="head">' +
        '<path d="M106 66 L76 14 L150 40 Z" fill="url(#' + s + 'P)" stroke="#cfc4ef" stroke-opacity="0.5" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M254 66 L284 14 L210 40 Z" fill="url(#' + s + 'P)" stroke="#cfc4ef" stroke-opacity="0.5" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M88 28 L138 42" stroke="#FF5FB0" stroke-width="2.5" opacity="0.65" stroke-linecap="round"/>' +
        '<path d="M272 28 L222 42" stroke="#36E0E6" stroke-width="2.5" opacity="0.65" stroke-linecap="round"/>' +
        '<rect x="42" y="38" width="276" height="220" rx="106" fill="url(#' + s + 'P)" stroke="#cfc4ef" stroke-opacity="0.55" stroke-width="2"/>' +
        '<path d="M96 70 Q180 38 264 70" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path d="M252 58 Q294 80 304 122" stroke="#9c8dd0" stroke-opacity="0.55" stroke-width="2.5"/>' +
        '<rect x="66" y="80" width="204" height="148" rx="66" stroke="#FF5FB0" stroke-width="8" opacity="0.85" filter="url(#' + s + 'M)"/>' +
        '<rect x="66" y="80" width="204" height="148" rx="66" fill="url(#' + s + 'V)"/>' +
        '<rect x="66" y="80" width="204" height="148" rx="66" stroke="#ff9ed3" stroke-width="3"/>' +
        '<g fill="#ffffff">' +
          '<circle cx="104" cy="116" r="1.8" opacity="0.9"/><circle cx="142" cy="100" r="1.4" opacity="0.7"/>' +
          '<circle cx="196" cy="108" r="1.8" opacity="0.85"/><circle cx="236" cy="124" r="1.4" opacity="0.7"/>' +
          '<circle cx="120" cy="186" r="1.4" opacity="0.6"/><circle cx="170" cy="200" r="1.8" opacity="0.8"/>' +
          '<circle cx="224" cy="190" r="1.4" opacity="0.65"/><circle cx="246" cy="160" r="1.2" opacity="0.55"/>' +
          '<circle cx="92" cy="152" r="1.2" opacity="0.5"/></g>' +
        '<path d="M156 122 L156 130 M152 126 L160 126" stroke="#9bf4ff" stroke-width="1.6" opacity="0.85"/>' +
        '<path d="M210 178 L210 186 M206 182 L214 182" stroke="#9bf4ff" stroke-width="1.6" opacity="0.7"/>' +
        '<g class="eye eyeL">' +
          '<ellipse cx="138" cy="156" rx="16" ry="23" fill="url(#' + s + 'E)" filter="url(#' + s + 'M)" opacity="0.8"/>' +
          '<ellipse cx="138" cy="156" rx="14" ry="21" fill="url(#' + s + 'E)"/>' +
          '<ellipse cx="134" cy="148" rx="4.5" ry="6" fill="#ffffff" opacity="0.95"/>' +
          '<rect class="blinklid" x="119" y="130" width="38" height="54" rx="17" fill="#0b0726"/></g>' +
        '<g class="eye eyeR">' +
          '<ellipse cx="212" cy="156" rx="16" ry="23" fill="url(#' + s + 'E)" filter="url(#' + s + 'M)" opacity="0.8"/>' +
          '<ellipse cx="212" cy="156" rx="14" ry="21" fill="url(#' + s + 'E)"/>' +
          '<ellipse cx="208" cy="148" rx="4.5" ry="6" fill="#ffffff" opacity="0.95"/>' +
          '<rect class="blinklid" x="193" y="130" width="38" height="54" rx="17" fill="#0b0726"/></g>' +
        '<g class="brow">' +
          '<path d="M114 126 L160 142" stroke="#FF5FB0" stroke-width="5.5" stroke-linecap="round" filter="url(#' + s + 'S)" opacity="0.85"/>' +
          '<path d="M236 126 L190 142" stroke="#FF5FB0" stroke-width="5.5" stroke-linecap="round" filter="url(#' + s + 'S)" opacity="0.85"/>' +
          '<path d="M114 126 L160 142" stroke="#ff9ed3" stroke-width="2.5" stroke-linecap="round"/>' +
          '<path d="M236 126 L190 142" stroke="#ff9ed3" stroke-width="2.5" stroke-linecap="round"/></g>' +
        '<path class="smile" d="M162 198 Q180 212 198 198" stroke="#7fe9ff" stroke-width="4" stroke-linecap="round"/>' +
        '<g class="blush">' +
          '<rect x="102" y="188" width="20" height="7" rx="3.5" fill="#FF5FB0" opacity="0.75"/>' +
          '<rect x="238" y="188" width="20" height="7" rx="3.5" fill="#FF5FB0" opacity="0.75"/></g>' +
        '<g class="spark">' +
          '<path d="M170 96 q10 -12 20 -1 q7 8 -3 14 q-7 4 -7 11" stroke="#9bf4ff" stroke-width="3.5" stroke-linecap="round"/>' +
          '<circle cx="180" cy="128" r="3" fill="#9bf4ff"/></g>' +
        '<circle cx="306" cy="154" r="52" fill="url(#' + s + 'P)" stroke="#cfc4ef" stroke-opacity="0.5" stroke-width="2"/>' +
        '<circle cx="306" cy="154" r="38" stroke="#FF5FB0" stroke-width="10" opacity="0.8" filter="url(#' + s + 'M)"/>' +
        '<circle cx="306" cy="154" r="38" stroke="#ff9ed3" stroke-width="5"/>' +
        '<circle cx="306" cy="154" r="24" fill="url(#' + s + 'PC)"/>' +
        '<circle cx="306" cy="154" r="24" fill="#1a0b2e" opacity="0.55"/>' +
        '<circle cx="306" cy="154" r="10" fill="url(#' + s + 'PC)" filter="url(#' + s + 'S)"/>' +
      '</g>' +
    '</g></svg>';
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var MOODS = ["idle", "battle", "happy", "curious"];

  function mount(host, opts) {
    opts = opts || {};
    ensureStyle();
    var s = "trx" + (uid++) + "_";
    host.innerHTML = svgMarkup(s);
    var svg = host.querySelector("svg");
    var mood = "idle";
    function setMood(m) {
      if (MOODS.indexOf(m) < 0) m = "idle";
      svg.classList.remove("m-" + mood);
      mood = m;
      svg.classList.add("m-" + mood);
    }
    function pulse() {
      svg.classList.remove("pulsing");
      void svg.getBoundingClientRect();
      svg.classList.add("pulsing");
      setTimeout(function () { svg.classList.remove("pulsing"); }, 800);
    }
    if (opts.mood) setMood(opts.mood);
    return { el: svg, setMood: setMood, pulse: pulse, getMood: function () { return mood; } };
  }

  window.Trix = { mount: mount };
})();

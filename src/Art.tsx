import type { Category, Product } from "./types";
import { useId, useState, useEffect } from "react";
import { routeHref } from "./runtime";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a
      className={"logo" + (small ? " small" : "")}
      href={routeHref("/")}
      aria-label="Shohstore"
    >
      <svg
        width="38"
        height="44"
        viewBox="0 0 48 52"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={small ? "brand2" : "brand"}
            x1="5"
            y1="4"
            x2="44"
            y2="46"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#eaa56c" />
            <stop offset=".55" stopColor="#ed7d64" />
            <stop offset="1" stopColor="#d75b78" />
          </linearGradient>
        </defs>
        <g
          stroke={"url(#" + (small ? "brand2" : "brand") + ")"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 23V8a3 3 0 0 1 3-3h17a3 3 0 0 1 3 3v31H19a6 6 0 0 1-6-5V23a6 6 0 0 0-6-6H4M14 28h27M24 28v11M33 28v11" />
          <circle cx="29" cy="17" r="5" />
          <path d="M29 14v3M20 46h1m14 0h1" />
        </g>
      </svg>
      <span>
        shoh<span>store</span>
        <i>®</i>
      </span>
    </a>
  );
}
function Fan({ x, y, r = 22 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#181b20" stroke="#4e5258" strokeWidth="2" />
      <circle r={r - 4} fill="none" stroke="#bd8678" strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          transform={`rotate(${a})`}
          d={`M0 0 Q${r} -${r} ${r - 7} 0 Q${r - 9} ${r / 2} 0 0`}
          fill="#383d44"
        />
      ))}
      <circle r="5" fill="#797d82" />
    </g>
  );
}
export function ProductArt({
  product,
  category,
  className = "",
}: {
  product?: Product;
  category?: Category;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product?.image]);
  const cat = product?.category || category || "cpu";
  if (product?.image && !failed)
    return (
      <img
        className={"product-art " + className}
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  return (
    <svg
      className={"product-art " + className}
      viewBox="0 0 320 230"
      role="img"
      aria-label={product?.name || cat}
    >
      <defs>
        <linearGradient id={id + "metal"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e6e8e8" />
          <stop offset=".4" stopColor="#a9aeb1" />
          <stop offset=".6" stopColor="#d7dbdd" />
          <stop offset="1" stopColor="#858e94" />
        </linearGradient>
        <linearGradient id={id + "dark"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#454a50" />
          <stop offset="1" stopColor="#14171c" />
        </linearGradient>
        <filter id={id + "shadow"} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="12" stdDeviation="8" floodOpacity=".14" />
        </filter>
      </defs>
      {cat === "cpu" ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(160 110) rotate(-12)"
        >
          <rect
            x="-70"
            y="-69"
            width="140"
            height="140"
            rx="3"
            fill="#31554c"
            stroke="#769477"
            strokeWidth="2"
          />
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i} fill="#c5b581">
              <rect x={-66 + i * 9.8} y="-69" width="4" height="7" />
              <rect x={-66 + i * 9.8} y="64" width="4" height="7" />
            </g>
          ))}
          <path
            d="M-55-57h110v15h7v23h-7v40h7v21h-7v15H-55V42h-7V20h7v-39h-7v-23h7Z"
            fill={`url(#${id}metal)`}
            stroke="#e0e2e2"
            strokeWidth="2"
          />
          <text
            x="0"
            y="-23"
            textAnchor="middle"
            fill="#42494b"
            fontSize="10"
            fontFamily="Arial"
          >
            {product?.brand === "Intel" ? "intel®" : "AMD"}
          </text>
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fill="#4a5154"
            fontSize="22"
            fontWeight="700"
            fontFamily="Arial"
          >
            {product?.brand === "Intel" ? "CORE i5" : "RYZEN"}
          </text>
          <text
            x="0"
            y="21"
            textAnchor="middle"
            fill="#656c70"
            fontSize="7"
            fontFamily="Arial"
          >
            {product?.name.includes("7600")
              ? "5 7600"
              : product?.brand === "Intel"
                ? "i5-14600KF"
                : "7 7800X3D"}
          </text>
          <text x="0" y="42" textAnchor="middle" fill="#71777a" fontSize="5.5">
            DIFFUSED IN TAIWAN · MADE IN MALAYSIA
          </text>
        </g>
      ) : cat === "gpu" ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(20 45) rotate(-8 140 70)"
        >
          <path d="M10 38 30 16h240v103l-17 13H10Z" fill="#1c2025" />
          <path d="M17 25h254l-12 16H10Z" fill="#51565a" />
          <rect
            x="10"
            y="41"
            width="246"
            height="83"
            rx="6"
            fill={`url(#${id}dark)`}
            stroke="#596067"
          />
          <path d="M0 36h10v100H0Z" fill="#a0a6a9" />
          {[55, 134, 212].map((x) => (
            <Fan key={x} x={x} y={82} r={32} />
          ))}
          <path d="M58 128h130v8H58Z" fill="#b8a66e" />
          <text
            x="155"
            y="32"
            fill="#d5d8db"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
          >
            GEFORCE RTX
          </text>
        </g>
      ) : cat.startsWith("mb-") ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(93 24) rotate(-8 65 90)"
        >
          <rect
            width="141"
            height="181"
            fill="#2d3338"
            stroke="#5a6266"
            rx="3"
          />
          <path d="M5 18h22v71H5Z" fill="#81878a" />
          <rect
            x="47"
            y="39"
            width="49"
            height="53"
            fill="#aeb4b4"
            stroke="#d4d7d6"
            strokeWidth="2"
          />
          <rect x="54" y="46" width="35" height="38" fill="#393d3c" />
          {[107, 116, 125].map((x) => (
            <rect key={x} x={x} y="24" width="5" height="90" fill="#737879" />
          ))}
          {[112, 133, 155].map((y) => (
            <rect key={y} x="24" y={y} width="85" height="6" fill="#929796" />
          ))}
          <path
            d="M36 8h60v21H36ZM9 102h22v62H9ZM80 161h49v13H80Z"
            fill="#646d72"
          />
          <path
            d="m38 7 16 20m6-20 16 20m-52 81 10 34"
            stroke="#98a0a4"
            strokeWidth="2"
          />
          <circle cx="113" cy="143" r="10" fill="#8e9698" />
          <text x="69" y="106" fill="#c9cdd0" fontSize="7" textAnchor="middle">
            {product?.brand === "MSI" ? "MSI PRO" : "TUF GAMING"}
          </text>
        </g>
      ) : cat === "ram" ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(26 50) rotate(-10 135 65)"
        >
          {[0, 48].map((y, i) => (
            <g key={y} transform={`translate(${i * 10} ${y})`}>
              <rect
                x="4"
                y="12"
                width="245"
                height="41"
                rx="4"
                fill="#282b2f"
              />
              <path d="M8 20h237v27H8Z" fill={`url(#${id}dark)`} />
              <path
                d="m12 13 25 30m4-30 25 30m96-30 25 30m4-30 25 30"
                stroke="#55595d"
                strokeWidth="3"
              />
              <rect x="83" y="17" width="83" height="25" fill="#34393c" />
              <text
                x="125"
                y="33"
                textAnchor="middle"
                fill="#e4e5e6"
                fontSize="11"
                fontWeight="700"
                fontFamily="Arial"
              >
                VENGEANCE
              </text>
              <path d="M14 53h112v6H14Zm120 0h103v6H134Z" fill="#bcab72" />
            </g>
          ))}
        </g>
      ) : cat === "case" || cat === "build" ? (
        <g transform="translate(80 12)" filter={`url(#${id}shadow)`}>
          <path
            d="m0 22 112-14 50 25v164l-112 17-50-26Z"
            fill="#202329"
            stroke="#484c51"
          />
          <path d="M6 27 109 15v173L6 179Z" fill="#2d3038" stroke="#4d5158" />
          <path d="m115 17 39 20v153l-39 8Z" fill="#15171c" />
          {[66, 112, 157].map((y) => (
            <g key={y} transform={`translate(136 ${y}) scale(.55 1)`}>
              <Fan x={0} y={0} r={21} />
            </g>
          ))}
          <rect
            x="22"
            y="45"
            width="65"
            height="112"
            fill="#343941"
            stroke="#4c545c"
          />
          <Fan x={54} y={78} r={22} />
          <path d="M12 128h83v19H12" fill="#565b62" />
          <rect x="79" y="48" width="4" height="53" fill="#d6a296" />
          <path d="m15 192 2 11m121-5v9" stroke="#282c33" strokeWidth="7" />
        </g>
      ) : cat === "psu" ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(58 53) rotate(-8 100 60)"
        >
          <path d="M0 24 123 0l77 36v93L76 145 0 115Z" fill="#1d2227" />
          <path d="m0 24 76 34 124-22-77-36Z" fill="#40464b" />
          <path d="M76 58v87l124-16V36Z" fill="#292f33" />
          <Fan x={64} y={59} r={40} />
          <path d="m88 72 101-17v43l-101 15Z" fill="#343a3e" />
          <text
            x="139"
            y="83"
            transform="rotate(-8 139 83)"
            textAnchor="middle"
            fill="#d8d4bd"
            fontSize="17"
            fontWeight="700"
          >
            RM750e
          </text>
          <text
            x="139"
            y="98"
            transform="rotate(-8 139 98)"
            textAnchor="middle"
            fill="#a4aaac"
            fontSize="7"
          >
            80 PLUS GOLD
          </text>
        </g>
      ) : cat === "ssd" ? (
        <g
          filter={`url(#${id}shadow)`}
          transform="translate(35 90) rotate(-15 125 25)"
        >
          <rect width="250" height="55" rx="3" fill="#292d2b" />
          <rect x="18" y="7" width="212" height="41" fill="#1b1e20" />
          <text x="29" y="25" fill="#c1c4c2" fontSize="10" fontWeight="700">
            SAMSUNG
          </text>
          <text x="29" y="41" fill="#b7b6b0" fontSize="14" fontWeight="700">
            990 EVO
          </text>
          <text x="195" y="31" fill="#c9d3cb" fontSize="13" fontWeight="700">
            1TB
          </text>
          <path d="M0 6h8v18H0Zm0 25h8v18H0Z" fill="#c4b575" />
        </g>
      ) : cat === "liquid" ? (
        <g filter={`url(#${id}shadow)`}>
          <rect
            x="30"
            y="36"
            width="120"
            height="163"
            rx="6"
            fill="#252a2f"
            stroke="#60676c"
          />
          <Fan x={90} y={79} r={34} />
          <Fan x={90} y={155} r={34} />
          <path
            d="M153 57C249-5 321 123 244 136M150 69C231 4 292 121 239 145"
            fill="none"
            stroke="#3c4146"
            strokeWidth="9"
          />
          <circle
            cx="229"
            cy="150"
            r="33"
            fill="#373d42"
            stroke="#85898e"
            strokeWidth="2"
          />
          <circle cx="229" cy="150" r="23" fill="#24282e" stroke="#ba817b" />
          <text x="229" y="154" fill="#c7c7c7" fontSize="8" textAnchor="middle">
            DEEPCOOL
          </text>
        </g>
      ) : (
        <g filter={`url(#${id}shadow)`} transform="translate(83 24)">
          <path d="M17 10h111v155H17Z" fill="#8b9296" />
          {Array.from({ length: 18 }, (_, i) => (
            <path
              key={i}
              d={`M15 ${20 + i * 7}h114`}
              stroke="#c1c6c8"
              strokeWidth="2"
            />
          ))}
          <rect x="21" y="22" width="106" height="120" rx="5" fill="#31363c" />
          <Fan x={74} y={82} r={45} />
          <path
            d="M45 168v18h62v-18"
            fill="none"
            stroke="#bfc1bc"
            strokeWidth="7"
          />
        </g>
      )}
    </svg>
  );
}
export function PCVisual({ installed = [] }: { installed?: Category[] }) {
  const has = (c: Category) =>
    installed.includes(c) || installed.includes("build");
  return (
    <svg
      viewBox="0 0 270 300"
      className="pc-visual"
      role="img"
      aria-label="PC build visualization"
    >
      <defs>
        <linearGradient id="casegrad">
          <stop stopColor="#383b41" />
          <stop offset="1" stopColor="#1d2025" />
        </linearGradient>
      </defs>
      <path
        d="m25 31 166-16 48 30v220l-168 20-46-29Z"
        fill="url(#casegrad)"
        stroke="#606369"
        strokeWidth="1.5"
      />
      <path d="m34 39 148-14v226L34 264Z" fill="#24282e" stroke="#555a63" />
      <path d="m194 27 35 24v207l-35 10Z" fill="#191c21" />
      {[82, 146, 210].map((y) => (
        <g key={y} transform={`translate(211 ${y}) scale(.5 1)`}>
          <Fan x={0} y={0} r={24} />
        </g>
      ))}
      <g
        className={
          has("mb-amd") || has("mb-intel") ? "installed" : "uninstalled"
        }
      >
        <rect
          x="50"
          y="51"
          width="113"
          height="154"
          rx="3"
          fill="#3b434a"
          stroke="#7e8a91"
          strokeDasharray={has("mb-amd") || has("mb-intel") ? "0" : "4 4"}
        />
        <path d="M58 65h25v59H58m57-58h27v114h-27" fill="#59656e" />
      </g>
      <g className={has("cpu") ? "installed" : "uninstalled"}>
        <rect
          x="88"
          y="79"
          width="37"
          height="39"
          rx="3"
          fill="#dcae91"
          stroke="#ebd9ca"
        />
        <text x="106" y="102" textAnchor="middle" fill="#3b3533" fontSize="9">
          CPU
        </text>
      </g>
      <g className={has("ram") ? "installed" : "uninstalled"}>
        <rect x="137" y="72" width="5" height="67" rx="2" fill="#d8ac88" />
        <rect x="147" y="72" width="5" height="67" rx="2" fill="#d8ac88" />
      </g>
      <g className={has("gpu") ? "installed" : "uninstalled"}>
        <rect
          x="43"
          y="156"
          width="132"
          height="29"
          rx="3"
          fill="#666e78"
          stroke="#bdc5cd"
        />
        <text x="108" y="175" fill="#e4dbd5" fontSize="9" textAnchor="middle">
          GEFORCE RTX
        </text>
      </g>
      <g className={has("psu") ? "installed" : "uninstalled"}>
        <path d="m39 222 97-8v34l-97 9Z" fill="#58616c" stroke="#a2acb8" />
        <text x="89" y="239" fill="#ebe3da" fontSize="9" textAnchor="middle">
          PSU
        </text>
      </g>
      <g
        className={has("cooler") || has("liquid") ? "installed" : "uninstalled"}
      >
        <Fan x={106} y={98} r={25} />
      </g>
      <g className={has("ssd") ? "installed" : "uninstalled"}>
        <rect x="87" y="135" width="42" height="8" fill="#baa37f" />
      </g>
      <path d="m43 273 1 14m159-12v10" stroke="#393e45" strokeWidth="8" />
      <circle cx="211" cy="49" r="2" fill="#d79b83" />
    </svg>
  );
}

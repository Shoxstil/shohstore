import type { Category, Product } from "./types";
import { useId, useState, useEffect } from "react";
import { routeHref } from "./runtime";
export function Logo({
  small = false,
  onNavigate,
}: {
  small?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      className={"logo" + (small ? " small" : "")}
      href={routeHref("/")}
      aria-label="Shohstore"
      onClick={(e) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate();
        }
      }}
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
      <circle r={r} fill="#20262d" stroke="#626971" strokeWidth="1.2" />
      <circle r={r - 3} fill="none" stroke="#cb9e86" strokeWidth="1.4" />
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          transform={`rotate(${(i * 360) / 7}) scale(${r / 26})`}
          d="M-2-4C-6-13 1-23 11-20C16-17 9-9 3-2Z"
          fill="#505963"
        />
      ))}
      <circle r={r * 0.2} fill="#a8adb0" />
      <circle r={r * 0.09} fill="#39414a" />
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
  if (cat === "case" || cat === "build")
    return (
      <PCVisual
        installed={
          cat === "build"
            ? [
                "build",
                /LS520|LS720|Kraken|Liquid|H100i|Pure Loop/i.test(
                  product?.specs.Cooling || "",
                )
                  ? "liquid"
                  : "cooler",
              ]
            : []
        }
        className={"product-art " + className}
        title={product?.name || "PC case"}
      />
    );
  if (cat === "mouse" || cat === "keyboard" || cat === "headset")
    return (
      <PeripheralArt
        category={cat}
        product={product}
        title={product?.name || cat}
        className={className}
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
            {product?.brand === "Intel" ? "CORE" : "RYZEN"}
          </text>
          <text
            x="0"
            y="21"
            textAnchor="middle"
            fill="#656c70"
            fontSize="7"
            fontFamily="Arial"
          >
            {product?.name.replace(/^(AMD Ryzen|Intel Core)\s*/, "") || "CPU"}
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
            {product?.specs.GPU?.toUpperCase() || "GRAPHICS"}
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
            {product?.brand?.toUpperCase() || "MAINBOARD"}
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
                {product?.brand?.toUpperCase() || "MEMORY"}
              </text>
              <path d="M14 53h112v6H14Zm120 0h103v6H134Z" fill="#bcab72" />
            </g>
          ))}
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
            {product?.specs.Power || "PSU"}
          </text>
          <text
            x="139"
            y="98"
            transform="rotate(-8 139 98)"
            textAnchor="middle"
            fill="#a4aaac"
            fontSize="7"
          >
            {product?.specs.Certification?.toUpperCase() || "ATX PSU"}
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
            {product?.brand?.toUpperCase() || "SSD"}
          </text>
          <text x="29" y="41" fill="#b7b6b0" fontSize="14" fontWeight="700">
            {product?.brand?.toUpperCase() || "NVMe SSD"}
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
            {product?.brand?.toUpperCase() || "AIO"}
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
export function PCVisual({
  installed = [],
  title = "PC build diagram",
  className = "",
}: {
  installed?: Category[];
  title?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const has = (c: Category) =>
    installed.includes(c) || installed.includes("build");
  const liquidActive =
    installed.includes("liquid") ||
    (installed.includes("build") && !installed.includes("cooler"));
  const airActive = installed.includes("cooler") && !liquidActive;
  const group = (c: Category, active = has(c)) => ({
    "data-component": c,
    "data-installed": active,
    className: active ? "installed" : "uninstalled",
  });
  return (
    <svg
      viewBox="0 0 380 400"
      className={"pc-visual " + className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={id + "frame"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#454d56" />
          <stop offset="1" stopColor="#1f252c" />
        </linearGradient>
        <linearGradient id={id + "glass"}>
          <stop stopColor="#28323c" />
          <stop offset="1" stopColor="#1c252e" />
        </linearGradient>
      </defs>
      <ellipse cx="192" cy="378" rx="143" ry="9" fill="#11191f" opacity=".12" />
      <rect x="63" y="350" width="35" height="20" rx="3" fill="#242b33" />
      <rect x="283" y="350" width="35" height="20" rx="3" fill="#242b33" />
      <rect
        x="39"
        y="24"
        width="302"
        height="333"
        rx="10"
        fill={"url(#" + id + "frame)"}
        stroke="#68727c"
        strokeWidth="1.4"
      />
      <rect x="47" y="32" width="286" height="15" rx="3" fill="#343e48" />
      <circle cx="315" cy="39" r="3" fill="#d6b399" />
      <path
        d="M61 38h76m7 0h8m7 0h8m7 0h8"
        stroke="#737c84"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="50"
        y="56"
        width="222"
        height="279"
        rx="5"
        fill={"url(#" + id + "glass)"}
        stroke="#596570"
      />
      <rect
        x="281"
        y="56"
        width="49"
        height="279"
        rx="4"
        fill="#182029"
        stroke="#47545f"
      />
      {[105, 192, 279].map((y) => (
        <Fan key={y} x={305} y={y} r={21} />
      ))}
      <path d="M281 149h49m-49 87h49" stroke="#3b4854" />
      <g {...group("mb-amd", has("mb-amd") || has("mb-intel"))}>
        <rect
          x="68"
          y="73"
          width="181"
          height="167"
          rx="4"
          fill="#374653"
          stroke="#8a9ba6"
        />
        <rect x="75" y="82" width="22" height="86" rx="2" fill="#616d79" />
        <path d="M107 81h57v12h-57m-5 135h126v8H102" fill="#75828c" />
        {[178, 193, 208, 223].map((x) => (
          <rect
            key={x}
            x={x}
            y="86"
            width="5"
            height="79"
            rx="1"
            fill="#17232d"
          />
        ))}
      </g>
      <g {...group("cpu")}>
        <rect
          x="108"
          y="102"
          width="53"
          height="51"
          rx="3"
          fill="#bfc4c4"
          stroke="#f2eeea"
        />
        <rect x="114" y="108" width="41" height="39" rx="2" fill="#e3d7c8" />
        <text
          x="134"
          y="132"
          textAnchor="middle"
          fontSize="11"
          fill="#4a443d"
          fontFamily="Arial"
        >
          CPU
        </text>
      </g>
      <g {...group("ram")}>
        <rect x="193" y="89" width="8" height="76" rx="2" fill="#bd987d" />
        <rect x="223" y="89" width="8" height="76" rx="2" fill="#bd987d" />
        <path d="M196 96v53m30-53v53" stroke="#f1d7b8" strokeWidth="2" />
      </g>
      <g {...group("ssd")}>
        <rect
          x="106"
          y="171"
          width="83"
          height="12"
          rx="2"
          fill="#a18e6a"
          stroke="#d6c9aa"
        />
        <text x="147" y="180" textAnchor="middle" fontSize="7" fill="#222a2d">
          NVMe SSD
        </text>
      </g>
      <g {...group("gpu")}>
        <rect
          x="64"
          y="198"
          width="194"
          height="40"
          rx="4"
          fill="#536271"
          stroke="#a9b6c2"
        />
        <rect x="70" y="203" width="182" height="29" rx="2" fill="#2c3946" />
        <Fan x={95} y={218} r={12} />
        <Fan x={134} y={218} r={12} />
        <text x="203" y="222" fontSize="10" textAnchor="middle" fill="#d3d9dd">
          GPU
        </text>
        <path d="M76 242h100" stroke="#c6af81" strokeWidth="3" />
      </g>
      {airActive && (
        <g {...group("cooler", true)}>
          <rect
            x="101"
            y="95"
            width="68"
            height="66"
            rx="4"
            fill="#6c7985"
            stroke="#a6b0b8"
          />
          <Fan x={135} y={128} r={27} />
        </g>
      )}
      {liquidActive && (
        <g {...group("liquid", true)}>
          <rect x="68" y="59" width="173" height="12" rx="3" fill="#88939c" />
          <circle
            cx="135"
            cy="127"
            r="22"
            fill="#293844"
            stroke="#ccab92"
            strokeWidth="3"
          />
          <path
            d="M149 112V88q0-10 10-10h45q9 0 9-9m-49 57V97q0-9 9-9h48q10 0 10-17"
            stroke="#667987"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )}
      <rect
        x="51"
        y="256"
        width="220"
        height="78"
        fill="#242f39"
        stroke="#495863"
      />
      <g {...group("psu")}>
        <rect
          x="63"
          y="269"
          width="103"
          height="52"
          rx="4"
          fill="#53616e"
          stroke="#a9b4bd"
        />
        <Fan x={91} y={295} r={17} />
        <text x="137" y="299" textAnchor="middle" fontSize="11" fill="#e1e2dd">
          PSU
        </text>
        <path
          d="M168 289h33q10 0 10-12v-30m-43 55h48q13 0 13-15v-37"
          fill="none"
          stroke="#657988"
          strokeWidth="3"
        />
      </g>
      <path
        d="M186 277h64m-64 9h64m-64 9h64m-64 9h64"
        stroke="#3f4d59"
        strokeWidth="2"
      />
      <rect
        x="50"
        y="56"
        width="222"
        height="279"
        rx="5"
        fill="none"
        stroke="#7e8c98"
        strokeWidth="1.1"
      />
      {[59, 264].flatMap((x) =>
        [65, 327].map((y) => (
          <circle key={x + "-" + y} cx={x} cy={y} r="2" fill="#a2a9ad" />
        )),
      )}
      <text
        x="64"
        y="348"
        fill="#8f9ba5"
        fontSize="8"
        fontFamily="Arial"
        letterSpacing="2"
      >
        SHOHSTORE / ATX
      </text>
    </svg>
  );
}
function PeripheralArt({
  category,
  title,
  className,
  product,
}: {
  category: Category;
  title: string;
  className: string;
  product?: Product;
}) {
  const model = product?.id || "";
  const brand = product?.brand || "";
  const accent =
    brand === "Razer"
      ? "#83987b"
      : brand === "HyperX"
        ? "#c0987f"
        : brand === "ASUS"
          ? "#9ba2ab"
          : "#b39c85";
  const mousePath = model.includes("g502")
    ? "M151 31c-35 3-49 34-54 65l-20 47 12 34 29 12c12 16 32 23 52 19 36-7 50-35 50-73V99c-1-45-25-73-69-68Z"
    : model.includes("deathadder")
      ? "M143 31c-42 3-58 39-57 84l4 34c5 43 34 62 74 58 43-5 64-35 57-77l-7-38c-7-43-31-65-71-61Z"
      : model.includes("viper")
        ? "M159 40c-32 0-55 29-57 70l-3 40c-1 31 23 51 60 51s61-20 60-51l-3-40c-2-41-25-70-57-70Z"
        : "M160 30c-43 0-64 39-64 87v21c0 43 24 67 64 67s64-24 64-67v-21c0-48-21-87-64-87Z";
  const full = product?.specs["Form factor"]?.startsWith("Full");
  const lightKeys = model.includes("keychron");
  return (
    <svg
      viewBox="0 0 320 230"
      className={"product-art " + className}
      role="img"
      aria-label={title}
    >
      {category === "mouse" ? (
        <g>
          <path d={mousePath} fill="#353e47" stroke="#78838b" strokeWidth="2" />
          <path
            d="M160 34v72m-62 13h124"
            fill="none"
            stroke="#84929c"
            strokeWidth="1.3"
          />
          <rect x="153" y="58" width="14" height="31" rx="6" fill={accent} />
          {[0, 1, ...(model.includes("g502") ? [2, 3] : [])].map((i) => (
            <rect
              key={i}
              x={108 + i * 5}
              y={126 + (i % 2) * 8}
              width="3"
              height="17"
              rx="1"
              fill="#8b999f"
            />
          ))}
          <path
            d="M146 171h28"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {model.includes("gpro") && (
            <path
              d="M208 123v20m6-20v20"
              stroke="#89979f"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>
      ) : category === "keyboard" ? (
        <g>
          <rect
            x={full ? 10 : 25}
            y="64"
            width={full ? 300 : 270}
            height="123"
            rx="8"
            fill="#303943"
            stroke="#77838d"
            strokeWidth="2"
          />
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: full ? 12 : 14 }, (_, c) => (
              <rect
                key={r + "-" + c}
                x={(full ? 20 : 36) + c * (full ? 17 : 17.5)}
                y={76 + r * 20}
                width="13"
                height="15"
                rx="2"
                fill={
                  lightKeys
                    ? r === 0
                      ? "#7b817d"
                      : "#b9b8ae"
                    : r === 4 && c > 3 && c < 9
                      ? accent
                      : "#55636f"
                }
                stroke="#849099"
                strokeWidth=".5"
              />
            )),
          )}
          {full &&
            Array.from({ length: 5 }, (_, r) =>
              Array.from({ length: 4 }, (_, c) => (
                <rect
                  key={r + "-" + c}
                  x={231 + c * 17.5}
                  y={76 + r * 20}
                  width="13"
                  height="15"
                  rx="2"
                  fill={r === 0 ? accent : "#55636f"}
                  stroke="#849099"
                  strokeWidth=".5"
                />
              )),
            )}
          <path
            d="M275 65V48q0-12-12-12h-46"
            stroke="#747e85"
            fill="none"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g>
          <path
            d="M88 119V96c0-88 144-88 144 0v23"
            fill="none"
            stroke={model.includes("g435") ? "#929fa5" : "#333f4b"}
            strokeWidth={model.includes("nova") ? 17 : 24}
            strokeLinecap="round"
          />
          <path
            d="M88 112V96c0-74 144-74 144 0v16"
            fill="none"
            stroke="#8c999f"
            strokeWidth="4"
          />
          <rect
            x="71"
            y="101"
            width="43"
            height="91"
            rx={model.includes("blackshark") ? 11 : 19}
            fill="#394652"
            stroke="#818e98"
            strokeWidth="2"
          />
          <rect
            x="206"
            y="101"
            width="43"
            height="91"
            rx={model.includes("blackshark") ? 11 : 19}
            fill="#394652"
            stroke="#818e98"
            strokeWidth="2"
          />
          <rect x="88" y="113" width="23" height="65" rx="11" fill={accent} />
          <rect x="209" y="113" width="23" height="65" rx="11" fill={accent} />
          {!model.includes("g435") && (
            <>
              <path
                d="M82 166v30q0 13 14 13h37"
                fill="none"
                stroke="#71818e"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <rect
                x="125"
                y="203"
                width="24"
                height="11"
                rx="5"
                fill="#3a4751"
              />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

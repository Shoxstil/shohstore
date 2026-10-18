import React, { useEffect, useState, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  UserRound,
  ShoppingBag,
  SlidersHorizontal,
  Heart,
  Plus,
  Minus,
  X,
  Check,
  ShieldCheck,
  Truck,
  Headphones,
  PackageCheck,
  MapPin,
  Menu,
  LayoutGrid,
  Cpu,
  Monitor,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Wind,
  Box,
  Zap,
  Droplets,
  Trash2,
  LogOut,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Command,
  Package,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { dictionaries, type Lang, type TranslationKey } from "./i18n";
import {
  api,
  categories,
  price,
  type Category,
  type Product,
  type CartItem,
  type User,
  type Order,
} from "./types";
import { Logo, ProductArt, PCVisual } from "./Art";
import "./styles.css";

const categoryIcons: Record<Category, typeof Cpu> = {
  cpu: Cpu,
  gpu: Monitor,
  "mb-amd": CircuitBoard,
  "mb-intel": CircuitBoard,
  ram: MemoryStick,
  ssd: HardDrive,
  psu: Zap,
  liquid: Droplets,
  cooler: Wind,
  case: Box,
  build: Monitor,
};
function readLocal<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}
const initialCart = () => {
  const value = readLocal<unknown>("shoh-cart", []);
  return Array.isArray(value)
    ? value
        .filter(
          (i): i is CartItem =>
            !!i &&
            typeof i.id === "string" &&
            Number.isInteger(i.qty) &&
            i.qty > 0 &&
            i.qty <= 20,
        )
        .slice(0, 30)
    : [];
};
function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = readLocal<string>("shoh-lang", "ru");
    return ["ru", "uz", "en"].includes(l) ? (l as Lang) : "ru";
  });
  const [theme, setTheme] = useState(() =>
    readLocal<string>("shoh-theme", "light") === "dark" ? "dark" : "light",
  );
  const t = (k: TranslationKey) => dictionaries[lang][k];
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState<Category | "all">("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured"),
    [expanded, setExpanded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(initialCart),
    [favorites, setFavorites] = useState<string[]>(() =>
      readLocal("shoh-favorites", []),
    ),
    [favoritesOnly, setFavoritesOnly] = useState(false);
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false),
    [cartReady, setCartReady] = useState(false);
  const [panel, setPanel] = useState<
      "cart" | "auth" | "account" | "checkout" | "orders" | null
    >(null),
    [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [catalogOpen, setCatalogOpen] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [info, setInfo] = useState<"delivery" | "warranty" | "contact" | null>(
      null,
    );
  const [path, setPath] = useState(location.pathname),
    [toast, setToast] = useState(""),
    [orderSuccess, setOrderSuccess] = useState<{
      id: string;
      total: number;
    } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null),
    syncing = useRef(false),
    cartUser = useRef<number | null>(null),
    lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    localStorage.setItem("shoh-lang", JSON.stringify(lang));
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("shoh-theme", JSON.stringify(theme));
  }, [theme]);
  useEffect(() => {
    const fn = () => {
      setPath(location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const navigate = (next: string) => {
    if (location.pathname !== next) history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "auto" });
    setMobileNav(false);
    setCatalogOpen(false);
  };
  const notify = (s: string) => setToast(s);
  async function fetchProducts() {
    setLoading(true);
    setLoadError("");
    try {
      const d = await api<{ products: Product[] }>("/products");
      setProducts(d.products);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void fetchProducts();
    api<{ user: User | null }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    localStorage.setItem("shoh-cart", JSON.stringify(cart));
    if (user && cartReady && cartUser.current === user.id && !syncing.current) {
      const timer = setTimeout(() => {
        api("/cart", "PUT", { items: cart }).catch((e) =>
          notify(
            t((e as Error).message as TranslationKey) || t("server_error"),
          ),
        );
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [cart, cartReady, user?.id]);
  useEffect(() => {
    if (!authReady) return;
    setCartReady(false);
    if (!user) {
      cartUser.current = null;
      setCartReady(true);
      return;
    }
    syncing.current = true;
    api<{ items: CartItem[] }>("/cart")
      .then((d) => {
        setCart((current) => {
          const merged = [...current];
          for (const item of d.items)
            if (!merged.find((i) => i.id === item.id)) merged.push(item);
          return merged;
        });
        cartUser.current = user.id;
        syncing.current = false;
        setCartReady(true);
      })
      .catch(() => {
        syncing.current = false;
        setCartReady(true);
      });
  }, [user?.id, authReady]);
  useEffect(() => {
    localStorage.setItem("shoh-favorites", JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    if (loading || loadError) return;
    const available = cart.flatMap((item) => {
      const p = products.find((p) => p.id === item.id);
      return p?.stock
        ? [{ id: item.id, qty: Math.min(item.qty, p.stock, 20) }]
        : [];
    });
    if (JSON.stringify(available) !== JSON.stringify(cart)) {
      setCart(available);
      notify(t("invalid_cart"));
    }
  }, [products, loading, loadError, cart]);
  const overlay = !!panel || !!info || !!orderSuccess;
  useEffect(() => {
    if (!overlay) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            '[role="dialog"] button,[role="dialog"] input',
          )
          ?.focus(),
      50,
    );
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setInfo(null);
        setOrderSuccess(null);
      }
      if (e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"] button:not([disabled]),[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea,[role="dialog"] a[href]',
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = saved;
      document.removeEventListener("keydown", handle);
      clearTimeout(timer);
      lastFocused.current?.focus();
    };
  }, [panel, info, orderSuccess]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatalogOpen(false);
        setMobileNav(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const selectedProduct = path.startsWith("/product/")
    ? products.find((p) => p.id === decodeURIComponent(path.slice(9)))
    : undefined;
  const isAdmin = path === "/admin";
  useEffect(() => {
    document.title =
      (selectedProduct
        ? selectedProduct.name + " — "
        : isAdmin
          ? t("admin") + " — "
          : "") +
      "Shohstore" +
      (!selectedProduct && !isAdmin ? " — " + t("tagline") : "");
  }, [selectedProduct?.id, isAdmin, lang]);
  const itemRows = cart
    .map((i) => ({ ...i, product: products.find((p) => p.id === i.id) }))
    .filter((i): i is CartItem & { product: Product } => !!i.product);
  const total = itemRows.reduce((sum, i) => sum + i.product.price * i.qty, 0),
    count = itemRows.reduce((s, i) => s + i.qty, 0);
  const cpu = itemRows.find((i) => i.product.category === "cpu")?.product,
    mb = itemRows.find((i) => i.product.category.startsWith("mb-"))?.product;
  const socketsKnown = !!cpu?.specs.Socket && !!mb?.specs.Socket;
  const mismatch = socketsKnown && cpu?.specs.Socket !== mb?.specs.Socket;
  const shown = useMemo(() => {
    let list = products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!favoritesOnly || favorites.includes(p.id)) &&
        (!search.trim() ||
          `${p.name} ${p.brand} ${Object.values(p.specs).join(" ")} ${t(p.category)}`
            .toLowerCase()
            .includes(search.toLowerCase().trim())),
    );
    if (sort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, category, search, sort, favoritesOnly, favorites, lang]);
  function selectCategory(c: Category | "all") {
    setCategory(c);
    setFavoritesOnly(false);
    setExpanded(true);
    setCatalogOpen(false);
    setMobileNav(false);
    if (path !== "/") navigate("/");
    setTimeout(
      () =>
        document
          .getElementById("products")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }
  function toggleFavorite(p: Product) {
    setFavorites((f) =>
      f.includes(p.id) ? f.filter((id) => id !== p.id) : [...f, p.id],
    );
    notify(t(favorites.includes(p.id) ? "favoriteRemoved" : "favoriteAdded"));
  }
  function addProduct(p: Product, open = true) {
    if (p.stock < 1) return;
    let next = [...cart];
    const same = next.find((i) => i.id === p.id);
    if (same) {
      if (same.qty >= Math.min(20, p.stock)) {
        notify(t("stockLimit"));
        return;
      }
      next = next.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      const hasBuild = itemRows.some((i) => i.product.category === "build");
      if (
        (p.category === "build" && next.length > 0) ||
        (hasBuild && p.category !== "build")
      ) {
        if (!window.confirm(t("completePc"))) return;
        next = [];
      }
      const slot = (c: Category) =>
        c.startsWith("mb-")
          ? "mb"
          : c === "liquid" || c === "cooler"
            ? "cooling"
            : c;
      const replacing = itemRows.filter(
        (i) => slot(i.product.category) === slot(p.category),
      );
      if (replacing.length) {
        if (!window.confirm(t("replacePart"))) return;
        next = next.filter((i) => !replacing.some((r) => r.id === i.id));
      }
      next.push({ id: p.id, qty: 1 });
    }
    setCart(next);
    notify(t("componentAdded"));
    if (open) navigate("/product/" + p.id);
  }
  function updateQty(id: string, delta: number) {
    const p = products.find((p) => p.id === id);
    setCart((items) =>
      items.flatMap((i) =>
        i.id !== id
          ? [i]
          : i.qty + delta <= 0
            ? []
            : [{ ...i, qty: Math.min(i.qty + delta, p?.stock || 1, 20) }],
      ),
    );
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      setUser(null);
      setCart([]);
      setPanel(null);
      if (isAdmin) navigate("/");
    } catch (e) {
      notify(t((e as Error).message as TranslationKey) || t("server_error"));
    }
  }
  function goCheckout() {
    if (!user) {
      setAuthTab("login");
      setPanel("auth");
      notify(t("auth_required"));
      return;
    }
    setPanel("checkout");
  }
  function money(n: number) {
    return (
      <>
        {price(n)} <span className="currency">{t("currency")}</span>
      </>
    );
  }
  const header = (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>{t("tagline")}</span>
          <span className="top-location">
            <MapPin size={12} />
            {t("city")}
          </span>
          <button onClick={() => setInfo("contact")}>
            {t("help")} <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Logo />
          <button
            className={"catalog-button " + (catalogOpen ? "is-open" : "")}
            onClick={() => setCatalogOpen(!catalogOpen)}
            aria-expanded={catalogOpen}
          >
            <LayoutGrid size={17} />
            <span>{t("catalog")}</span>
            <ChevronDown size={14} />
          </button>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              selectCategory("all");
            }}
          >
            <Search size={18} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setExpanded(true);
                if (path !== "/") navigate("/");
              }}
              placeholder={t("search")}
              aria-label={t("search")}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("clear")}
              >
                <X size={15} />
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </form>
          <div className="header-actions">
            <button
              className="icon-button theme-button"
              onClick={() =>
                setTheme((v) => (v === "light" ? "dark" : "light"))
              }
              aria-label={t("theme")}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <label className="language-control">
              <select
                aria-label={t("language")}
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                <option value="ru">RU</option>
                <option value="uz">UZ</option>
                <option value="en">EN</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <button
              className="account-button"
              onClick={() => setPanel(user ? "account" : "auth")}
            >
              <UserRound size={20} />
              <span>{user ? user.name : t("login")}</span>
            </button>
            <button
              className="cart-button"
              onClick={() => setPanel("cart")}
              aria-label={t("cart")}
            >
              <ShoppingBag size={20} />
              <span>{t("cart")}</span>
              <b>{count}</b>
            </button>
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label={t("catalog")}
              aria-expanded={mobileNav}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
        <nav className="nav">
          <div className="container nav-inner">
            <div className="nav-links">
              <button
                onClick={() => {
                  setPanel("cart");
                }}
              >
                <span className="nav-status" />
                {t("navBuild")}
              </button>
              <button onClick={() => selectCategory("build")}>
                {t("navReady")}
              </button>
              <button onClick={() => setInfo("delivery")}>
                {t("navDelivery")}
              </button>
              <button onClick={() => setInfo("warranty")}>
                {t("navWarranty")}
              </button>
            </div>
            <span className="nav-caption">
              <ShieldCheck size={14} /> {t("heroNote")}
            </span>
          </div>
        </nav>
        {catalogOpen && (
          <>
            <div
              className="catalog-scrim"
              onClick={() => setCatalogOpen(false)}
            />
            <div className="container catalog-position">
              <div className="catalog-dropdown">
                {categories.map((c) => {
                  const Icon = categoryIcons[c];
                  return (
                    <button key={c} onClick={() => selectCategory(c)}>
                      <Icon size={19} />
                      <span>{t(c)}</span>
                      <ChevronRight size={14} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {mobileNav && (
          <div className="mobile-nav">
            {categories.map((c) => (
              <button key={c} onClick={() => selectCategory(c)}>
                {t(c)}
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
      </header>
    </>
  );

  function ProductCard({ p }: { p: Product }) {
    const inCart = cart.some((i) => i.id === p.id);
    return (
      <article className="product-card">
        <div className="product-image">
          <a
            href={"/product/" + p.id}
            onClick={(e) => {
              e.preventDefault();
              navigate("/product/" + p.id);
            }}
            aria-label={p.name}
          >
            <ProductArt product={p} />
          </a>
          {p.badge && <span className={"badge " + p.badge}>{t(p.badge)}</span>}
          <button
            className={
              "favorite-button " + (favorites.includes(p.id) ? "active" : "")
            }
            onClick={() => toggleFavorite(p)}
            aria-label={t("favorites")}
            aria-pressed={favorites.includes(p.id)}
          >
            <Heart
              size={18}
              fill={favorites.includes(p.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="product-body">
          <div className="product-category">{t(p.category)}</div>
          <a
            className="product-name"
            href={"/product/" + p.id}
            onClick={(e) => {
              e.preventDefault();
              navigate("/product/" + p.id);
            }}
          >
            {p.name}
          </a>
          <div className="product-specs">
            {Object.entries(p.specs)
              .filter(
                ([key]) =>
                  !["Socket", "TDP", "Power", "Wireless"].includes(key),
              )
              .slice(0, 3)
              .map(([, v]) => v)
              .join(" · ")}
          </div>
          <div className={"stock " + (!p.stock ? "none" : "")}>
            <i />
            {t(p.stock ? "inStock" : "outStock")}
          </div>
          <div className="card-bottom">
            <div className="price-group">
              {p.oldPrice && (
                <s>
                  {price(p.oldPrice)} {t("currency")}
                </s>
              )}
              <strong>{money(p.price)}</strong>
            </div>
            <button
              className={"add-button " + (inCart ? "added" : "")}
              disabled={!p.stock}
              onClick={() => addProduct(p)}
              aria-label={t("add") + " " + p.name}
            >
              {inCart ? <Check size={17} /> : <Plus size={17} />}
              <span>{t(inCart ? "added" : "add")}</span>
            </button>
          </div>
        </div>
      </article>
    );
  }
  const home = (
    <main id="main-content">
      <section className="container hero-section">
        <div className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span />
              {t("heroTag")}
            </div>
            <h1>
              {t("hero1")}
              <br />
              <span>{t("hero2")}</span>
            </h1>
            <p>{t("heroDesc")}</p>
            <div className="hero-buttons">
              <button
                className="button primary"
                onClick={() => selectCategory("all")}
              >
                {t("heroCta")}
                <ArrowUpRight size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => selectCategory("build")}
              >
                {t("heroSecondary")}
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="hero-social">
              <span className="tiny-circles">
                <i>
                  <Cpu size={12} />
                </i>
                <i>
                  <Monitor size={12} />
                </i>
                <i>
                  <Zap size={12} />
                </i>
              </span>
              <span>{t("heroNote")}</span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/images/hero-pc.webp"
              alt="Shohstore PRO — компьютер с прозрачным корпусом и мягкой подсветкой"
              fetchPriority="high"
              width="1024"
              height="683"
              onError={(e) => (e.currentTarget.style.opacity = "0")}
            />
            <span className="hero-orbit orbit-one" />
            <span className="hero-orbit orbit-two" />
            <div className="hero-number">
              01 <span>/ 03</span>
            </div>
            <div className="hero-product-label">
              <span>
                <i />
                {t("heroCard")}
              </span>
              <strong>
                {t("heroModel")}
                <ArrowUpRight size={17} />
              </strong>
              <small>Ryzen 7 · RTX 5070 · DDR5</small>
            </div>
            <button
              className="hero-price-tag"
              onClick={() => {
                const p = products.find((p) => p.id === "shohstore-pro");
                if (p) navigate("/product/" + p.id);
              }}
            >
              {t("heroPrice")} <span>{t("currency")}</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <section className="container trust-strip">
        {[
          [ShieldCheck, "trust1", "trust1desc"],
          [PackageCheck, "trust2", "trust2desc"],
          [Truck, "trust3", "trust3desc"],
          [Headphones, "trust4", "trust4desc"],
        ].map(([Icon, title, desc]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <div className="trust-item" key={title as string}>
              <I size={24} strokeWidth={1.5} />
              <div>
                <strong>{t(title as TranslationKey)}</strong>
                <span>{t(desc as TranslationKey)}</span>
              </div>
            </div>
          );
        })}
      </section>
      <section className="container products-section" id="products">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t("selection")}</div>
            <h2>{favoritesOnly ? t("favorites") : t("popular")}</h2>
            <p>{t("popularSub")}</p>
          </div>
          <button
            className="text-button all-components"
            onClick={() => {
              setCategory("all");
              setExpanded(true);
              setSearch("");
              setFavoritesOnly(false);
            }}
          >
            {t("allProducts")}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="filters-row">
          <div className="category-tabs">
            {(["all", "cpu", "gpu", "mb-amd", "ram", "build"] as const).map(
              (c) => (
                <button
                  className={category === c && !favoritesOnly ? "selected" : ""}
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setFavoritesOnly(false);
                    setExpanded(c !== "all");
                  }}
                >
                  {c === "all" ? <LayoutGrid size={15} /> : null}
                  {t(c === "mb-amd" ? "mb-amd" : c)}
                </button>
              ),
            )}
          </div>
          <div className="filter-actions">
            <button
              className={
                "icon-button favorites-filter " +
                (favoritesOnly ? "selected" : "")
              }
              onClick={() => {
                setFavoritesOnly(!favoritesOnly);
                setExpanded(true);
              }}
              aria-label={t("favorites")}
              aria-pressed={favoritesOnly}
            >
              <Heart size={17} />
            </button>
            <label className="sort-select">
              <SlidersHorizontal size={15} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label={t("sort")}
              >
                <option value="featured">{t("sort")}</option>
                <option value="asc">{t("priceAsc")}</option>
                <option value="desc">{t("priceDesc")}</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
        </div>
        {loading ? (
          <div className="loading-area">
            <Loader2 className="spin" />
            {t("loading")}
          </div>
        ) : loadError ? (
          <div className="empty-area">
            <AlertCircle size={30} />
            <h3>{t("errorTitle")}</h3>
            <p>{t(loadError as TranslationKey) || t("server_error")}</p>
            <button className="button secondary" onClick={fetchProducts}>
              {t("retry")}
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-area">
            <Search size={32} />
            <h3>{favoritesOnly ? t("noFavorites") : t("emptySearch")}</h3>
            <p>{t("emptySearchDesc")}</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setFavoritesOnly(false);
              }}
            >
              {t("reset")}
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {shown.slice(0, expanded ? shown.length : 4).map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
            {!expanded && shown.length > 4 && (
              <button
                className="show-all-button"
                onClick={() => setExpanded(true)}
              >
                {t("showAll")}
                <ArrowRight size={16} />
                <span>{products.length}</span>
              </button>
            )}
          </>
        )}
      </section>
      <section className="container builder-section">
        <div className="builder-banner">
          <div className="builder-banner-content">
            <div className="eyebrow">{t("buildTag")}</div>
            <h2>{t("buildTitle")}</h2>
            <p>{t("buildDesc")}</p>
            <button className="button light" onClick={() => setPanel("cart")}>
              {t("buildCta")}
              <ArrowUpRight size={17} />
            </button>
            <span className="builder-small">
              <CheckCircle2 size={13} />
              {t("buildSmall")}
            </span>
          </div>
          <div className="builder-illustration">
            <span className="builder-grid" />
            <div className="floating-component float-cpu">
              <Cpu size={21} />
              <span>CPU</span>
              <Check size={12} />
            </div>
            <PCVisual installed={itemRows.map((i) => i.product.category)} />
            <div className="floating-component float-gpu">
              <Monitor size={21} />
              <span>GPU</span>
              <Plus size={12} />
            </div>
            <div className="builder-progress">
              <span />
              {String(itemRows.length).padStart(2, "0")} <i>/ 08</i>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
  const productPage = selectedProduct ? (
    <main className="container product-page" id="main-content">
      <div className="breadcrumbs">
        <button onClick={() => navigate("/")}>{t("home")}</button>
        <ChevronRight size={13} />
        <button onClick={() => selectCategory(selectedProduct.category)}>
          {t(selectedProduct.category)}
        </button>
        <ChevronRight size={13} />
        <span>{selectedProduct.name}</span>
      </div>
      <button className="back-link" onClick={() => navigate("/")}>
        <ArrowLeft size={16} />
        {t("back")}
      </button>
      <div className="product-detail-grid">
        <div className="detail-image">
          <ProductArt product={selectedProduct} />
          {selectedProduct.badge && (
            <span className={"badge " + selectedProduct.badge}>
              {t(selectedProduct.badge)}
            </span>
          )}
          <button
            className={
              "favorite-button " +
              (favorites.includes(selectedProduct.id) ? "active" : "")
            }
            onClick={() => toggleFavorite(selectedProduct)}
            aria-label={t("favorites")}
          >
            <Heart size={22} />
          </button>
        </div>
        <div className="detail-info">
          <div className="eyebrow">
            {selectedProduct.brand || t(selectedProduct.category)}
          </div>
          <h1>{selectedProduct.name}</h1>
          <div className="stock">
            <i />
            {t(selectedProduct.stock ? "inStock" : "outStock")}
          </div>
          <p>{selectedProduct.description[lang]}</p>
          <div className="detail-price">
            {selectedProduct.oldPrice && (
              <s>
                {price(selectedProduct.oldPrice)} {t("currency")}
              </s>
            )}
            <strong>{money(selectedProduct.price)}</strong>
          </div>
          <button
            className="button primary wide"
            disabled={!selectedProduct.stock}
            onClick={() => {
              if (cart.some((i) => i.id === selectedProduct.id)) {
                setPanel("cart");
              } else addProduct(selectedProduct, false);
            }}
          >
            {cart.some((i) => i.id === selectedProduct.id) ? (
              <Check size={18} />
            ) : (
              <Plus size={18} />
            )}{" "}
            {t(cart.some((i) => i.id === selectedProduct.id) ? "added" : "add")}
            <ShoppingBag size={18} />
          </button>
          <div className="detail-perks">
            <span>
              <ShieldCheck size={17} />
              {t("guarantee")}
            </span>
            <span>
              <Truck size={17} />
              {t("delivery")}
            </span>
            <span>
              <PackageCheck size={17} />
              {t("payment")}
            </span>
          </div>
        </div>
      </div>
      <div className="specs-section">
        <h2>{t("specifications")}</h2>
        <dl>
          {Object.entries(selectedProduct.specs).map(([k, v]) => (
            <div key={k}>
              <dt>{specLabel(k, lang)}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">{t("footerNote")}</p>
      </div>
      <h2 className="related-title">{t("allProducts")}</h2>
      <div className="product-grid related-grid">
        {products
          .filter((p) => p.id !== selectedProduct.id)
          .slice(0, 4)
          .map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
      </div>
    </main>
  ) : (
    <div className="container empty-area">
      <h2>{t("emptySearch")}</h2>
      <button className="button primary" onClick={() => navigate("/")}>
        {t("back")}
      </button>
    </div>
  );

  const footer = (
    <footer className="footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Logo small />
          <p>{t("footerDesc")}</p>
          <span className="footer-location">
            <MapPin size={14} />
            {t("city")}
          </span>
        </div>
        <div className="footer-column">
          <h4>{t("footerStore")}</h4>
          <button onClick={() => selectCategory("all")}>{t("catalog")}</button>
          <button onClick={() => setPanel("cart")}>{t("navBuild")}</button>
          <button onClick={() => selectCategory("build")}>
            {t("navReady")}
          </button>
        </div>
        <div className="footer-column">
          <h4>{t("help")}</h4>
          <button onClick={() => setInfo("delivery")}>
            {t("navDelivery")}
          </button>
          <button onClick={() => setInfo("warranty")}>
            {t("navWarranty")}
          </button>
          <button onClick={() => setPanel(user ? "account" : "auth")}>
            {t("account")}
          </button>
        </div>
        <div className="footer-contact">
          <h4>{t("footerContact")}</h4>
          <button onClick={() => setInfo("contact")}>
            {t("help")}
            <ArrowUpRight size={20} />
          </button>
          <span>{t("contactText")}</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Shohstore. {t("footerRights")}
        </span>
        <span>{t("footerNote")}</span>
        <span className="footer-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </footer>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("skipContent")}
      </a>
      {header}
      {isAdmin ? (
        <AdminPanel
          user={user}
          products={products}
          lang={lang}
          t={t}
          onUpdate={fetchProducts}
          notify={notify}
          onLogin={() => setPanel("auth")}
        />
      ) : path.startsWith("/product/") ? (
        loading ? (
          <div className="loading-area">
            <Loader2 className="spin" />
            {t("loading")}
          </div>
        ) : (
          productPage
        )
      ) : (
        home
      )}
      {footer}
      {panel && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          <section
            className={
              "dialog " +
              (["cart", "account", "orders"].includes(panel)
                ? "side-panel"
                : "center-panel")
            }
            role="dialog"
            aria-modal="true"
            aria-label={t(
              panel === "cart"
                ? "cart"
                : panel === "checkout"
                  ? "checkout"
                  : panel === "orders"
                    ? "orders"
                    : panel === "account"
                      ? "account"
                      : "signIn",
            )}
          >
            <button
              className="dialog-close icon-button"
              onClick={() => setPanel(null)}
              aria-label={t("close")}
            >
              <X size={22} />
            </button>
            {panel === "cart" ? (
              <>
                <div className="drawer-heading">
                  <div className="eyebrow">SHOHSTORE BUILDER</div>
                  <h2>
                    {t("cart")}
                    <span>{count}</span>
                  </h2>
                </div>
                <div className="cart-visual">
                  <PCVisual
                    installed={itemRows.map((i) => i.product.category)}
                  />
                  <div className="cart-slots">
                    {(
                      [
                        "cpu",
                        "gpu",
                        "mb-amd",
                        "ram",
                        "ssd",
                        "psu",
                        "cooler",
                        "case",
                      ] as Category[]
                    ).map((c) => {
                      const installed = itemRows.some((i) =>
                        c === "mb-amd"
                          ? i.product.category.startsWith("mb-")
                          : c === "cooler"
                            ? ["cooler", "liquid"].includes(i.product.category)
                            : i.product.category === c ||
                              i.product.category === "build",
                      );
                      const Icon = categoryIcons[c];
                      return (
                        <button
                          className={installed ? "filled" : ""}
                          key={c}
                          onClick={() => {
                            setPanel(null);
                            selectCategory(c);
                          }}
                          title={t(c)}
                        >
                          <Icon size={15} />
                          <span>
                            {c === "mb-amd"
                              ? "MB"
                              : c === "case"
                                ? "CASE"
                                : c === "cooler"
                                  ? "FAN"
                                  : c.toUpperCase()}
                          </span>
                          {installed ? <Check size={12} /> : <Plus size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {itemRows.length ? (
                  <>
                    <div className="cart-items">
                      {itemRows.map((i) => (
                        <div className="cart-item" key={i.id}>
                          <button
                            className="cart-item-image"
                            onClick={() => {
                              setPanel(null);
                              navigate("/product/" + i.id);
                            }}
                          >
                            <ProductArt product={i.product} />
                          </button>
                          <div className="cart-item-content">
                            <button
                              className="cart-item-name"
                              onClick={() => {
                                setPanel(null);
                                navigate("/product/" + i.id);
                              }}
                            >
                              {i.product.name}
                            </button>
                            <strong>{money(i.product.price * i.qty)}</strong>
                            <div className="quantity">
                              <button
                                onClick={() => updateQty(i.id, -1)}
                                aria-label={t("qty") + " −"}
                              >
                                <Minus size={12} />
                              </button>
                              <span>{i.qty}</span>
                              <button
                                disabled={
                                  i.qty >= Math.min(20, i.product.stock)
                                }
                                onClick={() => updateQty(i.id, 1)}
                                aria-label={t("qty") + " +"}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                          <button
                            className="icon-button remove-button"
                            onClick={() =>
                              setCart((c) => c.filter((x) => x.id !== i.id))
                            }
                            aria-label={t("remove") + " " + i.product.name}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {socketsKnown && (
                      <div
                        className={
                          "compatibility " + (mismatch ? "warning" : "good")
                        }
                      >
                        {mismatch ? (
                          <AlertCircle size={17} />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                        <span>
                          {t(mismatch ? "incompatible" : "compatible")}
                        </span>
                      </div>
                    )}
                    <p className="compatibility-note">
                      {t("compatibilityNote")}
                    </p>
                    <div className="cart-summary">
                      <div>
                        <span>{t("total")}</span>
                        <strong>{money(total)}</strong>
                      </div>
                      <button
                        className="button primary wide"
                        disabled={mismatch}
                        onClick={goCheckout}
                      >
                        {t("checkout")}
                        <ArrowRight size={17} />
                      </button>
                      <button
                        className="text-button continue-shopping"
                        onClick={() => {
                          setPanel(null);
                          selectCategory("all");
                        }}
                      >
                        {t("continue")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="cart-empty">
                    <h3>{t("cartEmpty")}</h3>
                    <p>{t("cartEmptyDesc")}</p>
                    <button
                      className="button primary wide"
                      onClick={() => {
                        setPanel(null);
                        selectCategory("cpu");
                      }}
                    >
                      {t("continue")}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : panel === "auth" ? (
              <AuthForm
                tab={authTab}
                setTab={setAuthTab}
                t={t}
                onSuccess={(u) => {
                  setUser(u);
                  setPanel("account");
                }}
              />
            ) : panel === "account" ? (
              <>
                <div className="drawer-heading">
                  <div className="eyebrow">SHOHSTORE ACCOUNT</div>
                  <h2>{t("welcome")}</h2>
                </div>
                <div className="account-avatar">
                  <UserRound size={34} />
                </div>
                <h3 className="account-name">{user?.name}</h3>
                <p className="account-phone">
                  {user?.phone || t("accountPhone")}
                </p>
                <div className="account-links">
                  <button onClick={() => setPanel("orders")}>
                    <Package size={20} />
                    {t("orders")}
                    <ChevronRight size={17} />
                  </button>
                  <button onClick={() => setPanel("cart")}>
                    <ShoppingBag size={20} />
                    {t("cart")}
                    <ChevronRight size={17} />
                  </button>
                  {user?.role === "admin" && (
                    <button
                      onClick={() => {
                        setPanel(null);
                        navigate("/admin");
                      }}
                    >
                      <Settings size={20} />
                      {t("admin")}
                      <ChevronRight size={17} />
                    </button>
                  )}
                  <button onClick={logout}>
                    <LogOut size={19} />
                    {t("logout")}
                  </button>
                </div>
              </>
            ) : panel === "orders" ? (
              <OrdersPanel t={t} lang={lang} />
            ) : (
              <Checkout
                t={t}
                total={total}
                user={user}
                items={cart}
                onSuccess={(o) => {
                  setCart([]);
                  setPanel(null);
                  setOrderSuccess(o);
                  void fetchProducts();
                }}
              />
            )}
          </section>
        </div>
      )}
      {info && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInfo(null);
          }}
        >
          <section
            className="dialog center-panel info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t(
              info === "delivery"
                ? "infoDelivery"
                : info === "warranty"
                  ? "infoWarranty"
                  : "help",
            )}
          >
            <button
              className="dialog-close icon-button"
              onClick={() => setInfo(null)}
              aria-label={t("close")}
            >
              <X />
            </button>
            {info === "delivery" ? (
              <Truck size={34} />
            ) : info === "warranty" ? (
              <ShieldCheck size={34} />
            ) : (
              <Headphones size={34} />
            )}
            <h2>
              {t(
                info === "delivery"
                  ? "infoDelivery"
                  : info === "warranty"
                    ? "infoWarranty"
                    : "help",
              )}
            </h2>
            <p>
              {t(
                info === "delivery"
                  ? "infoDeliveryText"
                  : info === "warranty"
                    ? "infoWarrantyText"
                    : "contactText",
              )}
            </p>
            <button
              className="button secondary wide"
              onClick={() => setInfo(null)}
            >
              {t("close")}
            </button>
          </section>
        </div>
      )}
      {orderSuccess && (
        <div className="overlay">
          <section
            className="dialog center-panel order-success"
            role="dialog"
            aria-modal="true"
            aria-label={t("orderSuccess")}
          >
            <div className="success-circle">
              <Check size={32} />
            </div>
            <h2>{t("orderSuccess")}</h2>
            <strong>{orderSuccess.id}</strong>
            <p>{t("orderSuccessDesc")}</p>
            <div className="order-total">{money(orderSuccess.total)}</div>
            <button
              className="button primary wide"
              onClick={() => {
                setOrderSuccess(null);
                setPanel("orders");
              }}
            >
              {t("orders")}
              <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button onClick={() => setToast("")} aria-label={t("close")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

type Translator = (key: TranslationKey) => string;
function AuthForm({
  tab,
  setTab,
  t,
  onSuccess,
}: {
  tab: "login" | "register";
  setTab: (t: "login" | "register") => void;
  t: Translator;
  onSuccess: (u: User) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const body =
        tab === "register"
          ? {
              name: form.get("name"),
              phone: form.get("phone"),
              code: form.get("code"),
            }
          : { identifier: form.get("identifier"), code: form.get("code") };
      const d = await api<{ user: User }>("/auth/" + tab, "POST", body);
      onSuccess(d.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="auth-mark">
        <Command size={29} />
      </div>
      <h2>{t("welcome")}</h2>
      <p className="dialog-description">{t("authDesc")}</p>
      <div className="auth-tabs">
        <button
          className={tab === "login" ? "active" : ""}
          onClick={() => {
            setTab("login");
            setError("");
          }}
        >
          {t("signIn")}
        </button>
        <button
          className={tab === "register" ? "active" : ""}
          onClick={() => {
            setTab("register");
            setError("");
          }}
        >
          {t("register")}
        </button>
      </div>
      <form onSubmit={submit} key={tab} className="form">
        {tab === "register" ? (
          <>
            <label>
              {t("name")}
              <input
                name="name"
                minLength={2}
                maxLength={40}
                autoComplete="username"
                placeholder="Aziz"
              />
              <small>{t("nameNote")}</small>
            </label>
            <label>
              {t("phone")}
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                pattern={String.raw`\+[1-9][0-9\s\(\)\-]{7,22}`}
              />
              <small>{t("phoneNote")}</small>
            </label>
          </>
        ) : (
          <label>
            {t("identifier")}
            <input
              name="identifier"
              autoComplete="username"
              required
              placeholder="Aziz / +998 90 123 45 67"
            />
          </label>
        )}
        <label>
          {t("code")}
          <div className="password-input">
            <input
              name="code"
              type={show ? "text" : "password"}
              minLength={6}
              maxLength={128}
              required
              autoComplete={
                tab === "register" ? "new-password" : "current-password"
              }
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={t("code")}
              aria-pressed={show}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <small>{t("authNote")}</small>
        </label>
        {error && (
          <div className="form-error" role="alert">
            <AlertCircle size={16} />
            {t(error as TranslationKey) || t("server_error")}
          </div>
        )}
        <button className="button primary wide" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={18} />
          ) : (
            <>
              {t(tab === "register" ? "registerAction" : "loginAction")}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
    </>
  );
}
function Checkout({
  t,
  total,
  user,
  items,
  onSuccess,
}: {
  t: Translator;
  total: number;
  user: User | null;
  items: CartItem[];
  onSuccess: (o: { id: string; total: number }) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const data = await api<{ order: { id: string; total: number } }>(
        "/orders",
        "POST",
        { items, phone: f.get("phone"), note: f.get("note") },
      );
      onSuccess(data.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="eyebrow">SHOHSTORE CHECKOUT</div>
      <h2>{t("orderTitle")}</h2>
      <p className="dialog-description">{t("orderDesc")}</p>
      <form onSubmit={submit} className="form">
        <label>
          {t("phone")}
          <input
            type="tel"
            name="phone"
            defaultValue={user?.phone || ""}
            required
            pattern={String.raw`\+[1-9][0-9\s\(\)\-]{7,22}`}
            autoComplete="tel"
            placeholder="+998 90 123 45 67"
          />
        </label>
        <label>
          {t("orderNote")}
          <textarea name="note" maxLength={500} rows={3} />
        </label>
        <div className="checkout-total">
          <span>{t("total")}</span>
          <strong>
            {price(total)} {t("currency")}
          </strong>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {t(error as TranslationKey) || t("server_error")}
          </div>
        )}
        <button className="button primary wide" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : t("placeOrder")}
        </button>
      </form>
    </>
  );
}
function OrdersPanel({ t, lang }: { t: Translator; lang: Lang }) {
  const [orders, setOrders] = useState<Order[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ orders: Order[] }>("/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="drawer-heading">
        <div className="eyebrow">SHOHSTORE ACCOUNT</div>
        <h2>{t("orders")}</h2>
      </div>
      {error ? (
        <div className="form-error">
          {t(error as TranslationKey) || t("server_error")}
        </div>
      ) : orders === null ? (
        <Loader2 className="spin" />
      ) : !orders.length ? (
        <div className="empty-area">
          <Package size={38} />
          <h3>{t("noOrders")}</h3>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div>
                <strong>{o.id}</strong>
                <span>
                  {new Date(
                    o.created.replace(" ", "T") + "Z",
                  ).toLocaleDateString(
                    lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB",
                  )}
                </span>
              </div>
              {o.data.items.map((i) => (
                <p key={i.product.id}>
                  {i.product.name}
                  <span>×{i.qty}</span>
                </p>
              ))}
              <b>
                {price(o.total)} {t("currency")}
              </b>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AdminPanel({
  user,
  products,
  lang,
  t,
  onUpdate,
  notify,
  onLogin,
}: {
  user: User | null;
  products: Product[];
  lang: Lang;
  t: Translator;
  onUpdate: () => void;
  notify: (s: string) => void;
  onLogin: () => void;
}) {
  const [editing, setEditing] = useState<Product | "new" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  if (user?.role !== "admin")
    return (
      <main className="container empty-area">
        <ShieldCheck size={40} />
        <h2>{t("admin")}</h2>
        <p>{t("auth_required")}</p>
        <button className="button primary" onClick={onLogin}>
          {t("login")}
        </button>
      </main>
    );
  const item = editing && editing !== "new" ? editing : null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const specText = String(f.get("specs") || "");
      const specs: Record<string, string> = {};
      for (const line of specText.split("\n").filter(Boolean)) {
        const colon = line.indexOf(":");
        if (colon < 1) throw Error("invalid_product");
        specs[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
      }
      const data = {
        name: f.get("name"),
        category: f.get("category"),
        price: Number(f.get("price")),
        stock: Number(f.get("stock")),
        brand: f.get("brand"),
        image: f.get("image"),
        description: {
          ru: f.get("desc-ru"),
          uz: f.get("desc-uz"),
          en: f.get("desc-en"),
        },
        specs,
      };
      await api(
        item ? "/admin/products/" + item.id : "/admin/products",
        item ? "PUT" : "POST",
        data,
      );
      setEditing(null);
      notify(t("saved"));
      onUpdate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(p: Product) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeleting(p.id);
    try {
      await api("/admin/products/" + p.id, "DELETE");
      notify(t("deleted"));
      onUpdate();
    } catch (e) {
      notify(t((e as Error).message as TranslationKey) || t("server_error"));
    } finally {
      setDeleting(null);
    }
  }
  return (
    <main className="container admin-page" id="main-content">
      <div className="section-heading">
        <div>
          <div className="eyebrow">SHOHSTORE ADMIN</div>
          <h1>{t("adminTitle")}</h1>
          <p>
            {products.length} {t("found")}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setEditing("new");
            setError("");
          }}
        >
          <Plus size={17} />
          {t("newProduct")}
        </button>
      </div>
      {editing && (
        <form
          className="admin-form form"
          onSubmit={save}
          key={item?.id || "new"}
        >
          <h2>{t(item ? "edit" : "newProduct")}</h2>
          <div className="form-grid">
            <label>
              {t("productName")}
              <input
                name="name"
                defaultValue={item?.name}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              {t("category")}
              <select name="category" defaultValue={item?.category || "cpu"}>
                {categories.map((c) => (
                  <option value={c} key={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("price")}
              <input
                name="price"
                type="number"
                min="1"
                step="1"
                defaultValue={item?.price}
                required
              />
            </label>
            <label>
              {t("stock")}
              <input
                name="stock"
                type="number"
                min="0"
                max="10000"
                step="1"
                defaultValue={item?.stock ?? 1}
                required
              />
            </label>
            <label>
              {t("brand")}
              <input name="brand" defaultValue={item?.brand} maxLength={40} />
            </label>
            <label>
              {t("image")}
              <input
                name="image"
                type="url"
                pattern="https://.*"
                defaultValue={item?.image}
              />
            </label>
          </div>
          {(["ru", "uz", "en"] as Lang[]).map((l) => (
            <label key={l}>
              {t("description")} · {l.toUpperCase()}
              <textarea
                name={"desc-" + l}
                rows={2}
                maxLength={3000}
                defaultValue={item?.description[l]}
                required
              />
            </label>
          ))}
          <label>
            {t("specifications")}
            <textarea
              name="specs"
              rows={5}
              defaultValue={
                item
                  ? Object.entries(item.specs)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")
                  : ""
              }
              placeholder={t("specsHint")}
            />
            <small>{t("specsHint")}</small>
          </label>
          {error && (
            <div className="form-error">
              {t(error as TranslationKey) || t("server_error")}
            </div>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : t("save")}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
      <div className="admin-products">
        {products.map((p) => (
          <article key={p.id}>
            <ProductArt product={p} />
            <div>
              <h3>{p.name}</h3>
              <span>
                {t(p.category)} · {t("stock")}: {p.stock}
              </span>
            </div>
            <strong>
              {price(p.price)} {t("currency")}
            </strong>
            <button
              className="button secondary"
              onClick={() => {
                setEditing(p);
                setError("");
                window.scrollTo({ top: 100, behavior: "smooth" });
              }}
            >
              {t("edit")}
            </button>
            <button
              className="icon-button"
              disabled={deleting === p.id}
              onClick={() => remove(p)}
              aria-label={t("delete")}
            >
              <Trash2 size={18} />
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
function specLabel(k: string, l: Lang) {
  const labels: Record<string, Record<Lang, string>> = {
    Socket: { ru: "Сокет", uz: "Soket", en: "Socket" },
    Cores: { ru: "Количество ядер", uz: "Yadrolar soni", en: "Cores" },
    Threads: { ru: "Количество потоков", uz: "Oqimlar soni", en: "Threads" },
    "Base clock": {
      ru: "Базовая частота",
      uz: "Asosiy chastota",
      en: "Base clock",
    },
    "Boost clock": {
      ru: "Частота в турбо",
      uz: "Turbo chastota",
      en: "Boost clock",
    },
    Memory: { ru: "Память", uz: "Xotira", en: "Memory" },
    "Memory bus": { ru: "Шина памяти", uz: "Xotira shinasi", en: "Memory bus" },
    Power: { ru: "Мощность", uz: "Quvvat", en: "Power" },
    Chipset: { ru: "Чипсет", uz: "Chipset", en: "Chipset" },
    "Form factor": { ru: "Форм-фактор", uz: "Shakl omili", en: "Form factor" },
    Type: { ru: "Тип", uz: "Turi", en: "Type" },
    Frequency: { ru: "Частота", uz: "Chastota", en: "Frequency" },
    Capacity: { ru: "Объём", uz: "Hajm", en: "Capacity" },
    Processor: { ru: "Процессор", uz: "Protsessor", en: "Processor" },
    Graphics: { ru: "Видеокарта", uz: "Videokarta", en: "Graphics" },
    Storage: { ru: "Накопитель", uz: "Xotira qurilmasi", en: "Storage" },
  };
  return labels[k]?.[l] || k;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  name: string;
  slug: string;
  par: number | null;
  defaultBatchQty: number | null;
  category: Category | null;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type Weekday = typeof WEEKDAYS[number];

// ─── Numeric field with +/− buttons ──────────────────────────────────────────

function NumericField({
  id,
  value,
  onChange,
  min = 0,
}: {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  min?: number;
}) {
  const num = value.trim() === '' ? null : parseInt(value, 10);
  const atMin = num !== null && num <= min;

  const increment = () => {
    const next = num !== null ? num + 1 : min;
    onChange(String(next));
  };

  const decrement = () => {
    if (num === null || num <= min) return;
    onChange(String(num - 1));
  };

  return (
    <div className="flex items-center">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="w-[4ch] h-10 rounded-l-lg border border-border bg-background px-1 text-[15px] text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="flex flex-col h-10 rounded-r-lg overflow-hidden border-t border-r border-b border-border -ml-px">
        <button
          type="button"
          onClick={increment}
          className="flex-1 px-1.5 bg-background text-foreground text-xs flex items-center justify-center cursor-pointer hover:bg-muted transition-colors border-b border-border"
        >▲</button>
        <button
          type="button"
          onClick={decrement}
          disabled={num === null || atMin}
          className="flex-1 px-1.5 bg-background text-foreground text-xs flex items-center justify-center cursor-pointer hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-default"
        >▼</button>
      </div>
    </div>
  );
}

// ─── Item sheet (add + edit) ──────────────────────────────────────────────────

type SheetState =
  | { mode: 'add' }
  | { mode: 'edit'; item: Item };

function ItemSheet({
  state,
  categories,
  onClose,
  onSaved,
  onDeleted,
  onCategoryCreated,
}: {
  state: SheetState;
  categories: Category[];
  onClose: () => void;
  onSaved: (item: Item) => void;
  onDeleted?: (id: number) => void;
  onCategoryCreated: (cat: Category) => void;
}) {
  const nameId = useId();
  const parId = useId();
  const defaultBatchQtyId = useId();
  const categoryId = useId();
  const newCategoryId = useId();

  const initial = state.mode === 'edit' ? state.item : null;
  const [name, setName] = useState(initial?.name ?? '');
  const [parInput, setParInput] = useState(initial?.par != null ? String(initial.par) : '');
  const [defaultBatchQtyInput, setDefaultBatchQtyInput] = useState(initial?.defaultBatchQty != null ? String(initial.defaultBatchQty) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initial?.category?.id != null ? String(initial.category.id) : ''
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [operatingDays, setOperatingDays] = useState<Weekday[]>([]);
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});
  const [originalSchedule, setOriginalSchedule] = useState<Record<string, number>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, schedRes] = await Promise.all([
          fetch(`${API_URL}/bakery/settings`, { credentials: 'include' }),
          state.mode === 'edit'
            ? fetch(`${API_URL}/production-schedule`, { credentials: 'include' })
            : Promise.resolve(null),
        ]);

        const settingsData: { operatingDays: Weekday[] } = settingsRes.ok
          ? await settingsRes.json()
          : { operatingDays: [] };
        setOperatingDays(settingsData.operatingDays);

        if (state.mode === 'edit' && schedRes?.ok) {
          const schedData: { itemId: number; weekday: string; quantity: number }[] = await schedRes.json();
          const orig: Record<string, number> = {};
          for (const entry of schedData) {
            if (entry.itemId === state.item.id) orig[entry.weekday] = entry.quantity;
          }
          setOriginalSchedule(orig);
          const inputs: Record<string, string> = {};
          for (const [day, qty] of Object.entries(orig)) inputs[day] = String(qty);
          setScheduleInputs(inputs);
        }
      } catch {
        // silently fail — schedule section will just not appear
      } finally {
        setSettingsLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedPar = parInput.trim() === '' ? null : parseInt(parInput, 10);
  const parValid = parInput.trim() === '' || (!isNaN(parsedPar!) && parsedPar! >= 0);
  const parsedDefaultBatchQty = defaultBatchQtyInput.trim() === '' ? null : parseInt(defaultBatchQtyInput, 10);
  const defaultBatchQtyValid = defaultBatchQtyInput.trim() === '' || (!isNaN(parsedDefaultBatchQty!) && parsedDefaultBatchQty! >= 1);

  const isAddingNew = selectedCategoryId === '__new__';

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!parValid) { setError('Par must be a whole number (0 or more)'); return; }
    if (!defaultBatchQtyValid) { setError('Default batch qty must be a whole number (1 or more)'); return; }
    if (isAddingNew && !newCategoryName.trim()) { setError('Enter a name for the new category'); return; }

    for (const day of operatingDays) {
      const val = (scheduleInputs[day] ?? '').trim();
      if (val !== '') {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) {
          setError(`Bakeoff qty for ${day} must be a whole number (0 or more)`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    try {
      // If adding a new category, create it first
      let resolvedCategoryId: number | null = null;
      if (isAddingNew) {
        const catRes = await fetch(`${API_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        if (!catRes.ok) {
          const data = await catRes.json().catch(() => ({}));
          throw new Error((data as { message?: string }).message ?? 'Failed to create category');
        }
        const newCat: Category = await catRes.json();
        onCategoryCreated(newCat);
        resolvedCategoryId = newCat.id;
      } else if (selectedCategoryId !== '') {
        resolvedCategoryId = parseInt(selectedCategoryId, 10);
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        par: parsedPar,
        defaultBatchQty: parsedDefaultBatchQty,
        categoryId: resolvedCategoryId,
      };

      let res: Response;
      if (state.mode === 'add') {
        res = await fetch(`${API_URL}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_URL}/items/${state.item.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? 'Save failed');
      }

      const saved: Item = await res.json();

      // Persist bakeoff schedule
      if (operatingDays.length > 0) {
        const itemId = saved.id;
        const scheduleOps: Promise<void>[] = [];
        for (const day of operatingDays) {
          const val = (scheduleInputs[day] ?? '').trim();
          const qty = val === '' ? null : parseInt(val, 10);
          if (qty !== null && !isNaN(qty)) {
            scheduleOps.push(
              fetch(`${API_URL}/production-schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ itemId, weekday: day, quantity: qty }),
              }).then(() => {}),
            );
          } else if (qty === null && originalSchedule[day] !== undefined) {
            scheduleOps.push(
              fetch(`${API_URL}/production-schedule/${itemId}/${day}`, {
                method: 'DELETE',
                credentials: 'include',
              }).then(() => {}),
            );
          }
        }
        await Promise.all(scheduleOps);
      }

      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (state.mode !== 'edit') return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/items/${state.item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      onDeleted?.(state.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-card rounded-t-[16px] px-6 pt-6 pb-10 z-10 max-w-[630px] w-full mx-auto">
        <div className="w-9 h-1 bg-border rounded-full mx-auto mb-5" />

        <h2 className="text-xl font-semibold text-foreground mb-6">
          {state.mode === 'add' ? 'New Item' : 'Edit Item'}
        </h2>

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>
        )}

        {/* Name */}
        <div className="mb-4">
          <label htmlFor={nameId} className="block text-sm font-medium text-foreground mb-1.5">
            Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sourdough Loaf"
            className="w-full h-12 rounded-xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label htmlFor={categoryId} className="block text-sm font-medium text-foreground mb-1.5">
            Category <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            id={categoryId}
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className="w-full h-12 rounded-xl border border-border bg-background px-4 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No category</option>
            {categories.map(cat => (
              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
            ))}
            <option value="__new__">+ Add new category</option>
          </select>
          {isAddingNew && (
            <input
              id={newCategoryId}
              type="text"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="mt-2 w-full h-12 rounded-xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          )}
        </div>

        {/* Bakeoff qty by day */}
        {!settingsLoading && operatingDays.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Bakeoff qty by day <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <div className="flex gap-2">
              {operatingDays.map(day => (
                <div key={day} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">{day.slice(0, 3)}</span>
                  <NumericField
                    value={scheduleInputs[day] ?? ''}
                    onChange={val => setScheduleInputs(prev => ({ ...prev, [day]: val }))}
                    min={0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Par + Default batch qty */}
        <div className="flex gap-6 mb-7">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={parId} className="text-sm font-medium text-foreground">
              Par level <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <NumericField id={parId} value={parInput} onChange={setParInput} min={0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={defaultBatchQtyId} className="text-sm font-medium text-foreground">
              Default batch qty <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <NumericField id={defaultBatchQtyId} value={defaultBatchQtyInput} onChange={setDefaultBatchQtyInput} min={1} />
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Delete (edit mode only) */}
        {state.mode === 'edit' && (
          <div className="mt-5 pt-5 border-t border-border">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-sm text-destructive cursor-pointer py-1"
              >
                Delete item
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-center text-muted-foreground">
                  Delete <span className="font-semibold text-foreground">{state.item.name}</span>? This can't be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 h-11 rounded-full border border-border text-sm text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 h-11 rounded-full bg-destructive text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ItemsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`${API_URL}/items`, { credentials: 'include' }),
          fetch(`${API_URL}/categories`, { credentials: 'include' }),
        ]);
        if (!itemsRes.ok) throw new Error('Failed to load items');
        const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.ok ? catsRes.json() : []]);
        setItems(itemsData);
        setCategories(catsData);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSaved = (saved: Item) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      return idx >= 0
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved];
    });
    const isNew = !items.some(i => i.id === saved.id);
    showToast(isNew ? `${saved.name} added` : `${saved.name} updated`);
    setSheet(null);
  };

  const handleDeleted = (id: number) => {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    showToast(`${item?.name ?? 'Item'} deleted`);
    setSheet(null);
  };

  const handleCategoryCreated = (cat: Category) => {
    setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Derive the categories that actually have items (for chip visibility)
  const categoriesWithItems = categories.filter(cat => items.some(i => i.category?.id === cat.id));
  const hasUncategorized = items.some(i => i.category === null);

  // Build grouped list based on active filter
  const filteredItems = activeFilter !== null
    ? items.filter(i => i.category?.id === activeFilter)
    : items;

  // Group by category: categorized groups sorted by category name, then uncategorized at end
  const groupedItems: { label: string; items: Item[] }[] = [];
  const seen = new Set<number>();

  for (const cat of categories) {
    const group = filteredItems.filter(i => i.category?.id === cat.id);
    if (group.length > 0) {
      groupedItems.push({ label: cat.name, items: group });
      seen.add(cat.id);
    }
  }

  if (activeFilter === null) {
    const uncategorized = filteredItems.filter(i => i.category === null);
    if (uncategorized.length > 0) {
      groupedItems.push({ label: 'Uncategorized', items: uncategorized });
    }
  }

  const showChips = !loading && !fetchError && (categoriesWithItems.length > 0 || hasUncategorized);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-foreground leading-none">Items</h1>
          {!loading && !fetchError && (
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </header>

      {/* Filter chips */}
      {showChips && (
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
              activeFilter === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-foreground border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {categoriesWithItems.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                activeFilter === cat.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <main className="px-4 pt-3 pb-28 flex flex-col gap-2">
        {loading && (
          <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>
        )}
        {fetchError && (
          <p className="text-center text-destructive pt-12">{fetchError}</p>
        )}
        {!loading && !fetchError && items.length === 0 && (
          <div className="text-center pt-16 flex flex-col items-center gap-3">
            <p className="text-muted-foreground">No items yet.</p>
            <button
              onClick={() => setSheet({ mode: 'add' })}
              className="text-sm font-medium text-primary cursor-pointer"
            >
              Add your first item →
            </button>
          </div>
        )}
        {!loading && !fetchError && items.length > 0 && groupedItems.map(group => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1.5 mt-2 first:mt-0">
              {group.label}
            </h3>
            <div className="flex flex-col gap-2">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSheet({ mode: 'edit', item })}
                  className="w-full bg-card border border-border rounded-[12px] px-4 py-3.5 flex justify-between items-center text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
                >
                  <span className="text-[17px] font-medium text-foreground">{item.name}</span>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-sm text-muted-foreground">{item.par != null ? `par ${item.par}` : 'no par'}</div>
                    {item.defaultBatchQty != null && (
                      <div className="text-xs text-muted-foreground/70">batch {item.defaultBatchQty}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* FAB */}
      <button
        onClick={() => setSheet({ mode: 'add' })}
        aria-label="Add item"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_4px_16px_rgba(194,105,42,0.35)] cursor-pointer z-20"
      >
        <Plus size={28} />
      </button>

      {/* Sheet */}
      {sheet && (
        <ItemSheet
          state={sheet}
          categories={categories}
          onClose={() => setSheet(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCategoryCreated={handleCategoryCreated}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium z-40 shadow-lg whitespace-nowrap"
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

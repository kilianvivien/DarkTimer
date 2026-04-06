import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  FlaskConical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { EmptyState } from './EmptyState';
import { SearchableField } from './SearchableField';
import type { StoredChem, ChemType, ChemProcessMode } from '../services/chemTypes';
import { DEVELOPER_OPTIONS, FIXER_OPTIONS } from '../services/searchCatalog';
import type { SearchableOption } from '../services/searchCatalog';

interface ChemsViewProps {
  chems: StoredChem[];
  onAdd: (data: Omit<StoredChem, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<StoredChem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onIncrement: (id: string) => Promise<void>;
}

type ChemWarning = 'rolls' | 'expiry' | null;

function getChemWarning(chem: StoredChem): ChemWarning {
  if (chem.maxRolls !== null && chem.rollCount >= chem.maxRolls) return 'rolls';

  if (chem.expirationDate !== null) {
    const daysUntilExpiry = (chem.expirationDate - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 7) return 'expiry';
  }

  return null;
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDateValue(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function parseDateInput(value: string): number | null {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.getTime();
}

const PROCESS_MODE_LABELS: Record<ChemProcessMode, string> = {
  bw: 'B&W',
  color: 'Color - C41/ECN2',
  neutral: 'Slide - E6',
};

const PROCESS_MODE_BUTTON_LABELS: Record<ChemProcessMode, string> = {
  bw: 'B&W',
  color: 'Color',
  neutral: 'Slide',
};

const TYPE_LABELS: Record<ChemType, string> = {
  developer: 'Developer',
  fixer: 'Fixer',
};

const TYPE_BUTTON_LABELS: Record<ChemType, string> = {
  developer: 'Dev',
  fixer: 'Fixer',
};

interface AddChemFormData {
  name: string;
  type: ChemType;
  processMode: ChemProcessMode;
  mixDate: string;
  expirationDate: string;
  maxRolls: string;
  notes: string;
}

const EMPTY_FORM: AddChemFormData = {
  name: '',
  type: 'developer',
  processMode: 'bw',
  mixDate: formatDateValue(Date.now()),
  expirationDate: '',
  maxRolls: '',
  notes: '',
};

const SLIDE_PROCESS_KEYWORDS = ['e6', 'slide', 'reversal'];

function isSlideChemOption(option: SearchableOption): boolean {
  return option.keywords?.some((keyword) => SLIDE_PROCESS_KEYWORDS.includes(keyword.toLowerCase())) ?? false;
}

function getChemNameOptions(type: ChemType, processMode: ChemProcessMode): SearchableOption[] {
  const options = type === 'developer' ? DEVELOPER_OPTIONS : FIXER_OPTIONS;

  return options.filter((option) => {
    if (!option.processModes) {
      return true;
    }

    const isSlideOption = isSlideChemOption(option);

    if (processMode === 'bw') {
      return option.processModes.includes('bw');
    }

    if (processMode === 'neutral') {
      return isSlideOption;
    }

    return option.processModes.includes('color') && !isSlideOption;
  });
}

interface ChemCardProps {
  chem: StoredChem;
  warning: ChemWarning;
  onIncrement: () => void;
  onUpdate: (patch: Partial<Omit<StoredChem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: () => void;
  isDeleting: boolean;
  confirmDeleteId: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

const ChemCard: React.FC<ChemCardProps> = ({
  chem,
  warning,
  onIncrement,
  onUpdate,
  onDelete,
  isDeleting,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
}) => {
  const isConfirming = confirmDeleteId === chem.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AddChemFormData>({
    name: chem.name,
    type: chem.type,
    processMode: chem.processMode,
    mixDate: formatDateValue(chem.mixDate),
    expirationDate: chem.expirationDate ? formatDateValue(chem.expirationDate) : '',
    maxRolls: chem.maxRolls != null ? String(chem.maxRolls) : '',
    notes: chem.notes,
  });
  const [isSaving, setIsSaving] = useState(false);
  const editNameOptions = useMemo(
    () => getChemNameOptions(editForm.type, editForm.processMode),
    [editForm.processMode, editForm.type],
  );

  const setEditField = <K extends keyof AddChemFormData>(key: K, value: AddChemFormData[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate({
        name: editForm.name.trim(),
        type: editForm.type,
        processMode: editForm.processMode,
        mixDate: parseDateInput(editForm.mixDate) ?? chem.mixDate,
        expirationDate: editForm.expirationDate ? parseDateInput(editForm.expirationDate) : null,
        maxRolls: editForm.maxRolls ? parseInt(editForm.maxRolls, 10) || null : null,
        notes: editForm.notes.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'utilitarian-border bg-dark-panel overflow-hidden',
        warning && !isEditing && 'border-amber-500/40',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isEditing ? (
          <motion.form
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={(e) => void handleEditSubmit(e)}
            className="p-4 md:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3 pb-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent-red">Editing</p>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="press-feedback p-1 text-ui-gray hover:text-white transition-colors"
                aria-label="Cancel edit"
              >
                <X size={14} />
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <SearchableField
                label="Name *"
                options={editNameOptions}
                placeholder={editForm.type === 'developer' ? 'e.g. HC-110, Rodinal' : 'e.g. Ilford Rapid Fixer'}
                value={editForm.name}
                onChange={(value) => setEditField('name', value)}
              />
            </div>

            {/* Type + Process */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="mono-label">Type</label>
                <div className="grid grid-cols-2 border border-dark-border">
                  {(['developer', 'fixer'] as ChemType[]).map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditField('type', t)}
                      className={cn(
                        'press-feedback px-2 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors',
                        i === 0 ? 'border-r border-dark-border' : '',
                        editForm.type === t ? 'bg-white text-black' : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]',
                      )}
                      aria-pressed={editForm.type === t}
                    >
                      {TYPE_BUTTON_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="mono-label">Process</label>
                <div className="grid grid-cols-3 border border-dark-border">
                  {(['bw', 'color', 'neutral'] as ChemProcessMode[]).map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditField('processMode', p)}
                      className={cn(
                        'press-feedback px-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors',
                        i < 2 ? 'border-r border-dark-border' : '',
                        editForm.processMode === p ? 'bg-white text-black' : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]',
                      )}
                      aria-pressed={editForm.processMode === p}
                    >
                      {PROCESS_MODE_BUTTON_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 min-w-0 overflow-hidden">
                <label className="mono-label">Mixed Date *</label>
                <input
                  type="date"
                  value={editForm.mixDate}
                  onChange={(e) => setEditField('mixDate', e.target.value)}
                  className="utilitarian-input mobile-form-control-inline w-full px-2"
                  required
                />
              </div>
              <div className="space-y-1 min-w-0 overflow-hidden">
                <label className="mono-label">Expiration Date</label>
                <input
                  type="date"
                  value={editForm.expirationDate}
                  onChange={(e) => setEditField('expirationDate', e.target.value)}
                  className="utilitarian-input mobile-form-control-inline w-full px-2"
                />
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-1">
              <label className="mono-label">Capacity (max rolls)</label>
              <input
                type="number"
                value={editForm.maxRolls}
                onChange={(e) => setEditField('maxRolls', e.target.value)}
                className="utilitarian-input mobile-form-control-inline w-full md:w-40"
                placeholder="e.g. 24"
                min="1"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="mono-label">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditField('notes', e.target.value)}
                className="utilitarian-input mobile-form-control-inline w-full resize-none"
                rows={2}
                placeholder="Dilution, batch number, temperature…"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !editForm.name.trim()}
              className="utilitarian-button px-5 py-2.5 w-full sm:w-auto disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-4 md:p-5 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold uppercase tracking-tight text-white truncate">
                    {chem.name || '—'}
                  </h3>
                  <span className="px-2 py-0.5 border border-dark-border text-[10px] font-mono text-ui-gray uppercase shrink-0">
                    {TYPE_LABELS[chem.type]}
                  </span>
                  <span className="px-2 py-0.5 border border-dark-border text-[10px] font-mono text-ui-gray uppercase shrink-0">
                    {PROCESS_MODE_LABELS[chem.processMode]}
                  </span>
                  {warning && (
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono uppercase shrink-0',
                      'border-amber-500/40 bg-amber-500/10 text-amber-300',
                    )}>
                      <AlertTriangle size={10} />
                      {warning === 'rolls' ? 'Roll limit' : 'Expiring soon'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-widest text-ui-gray">
                  <span>Mixed {DATE_FORMATTER.format(chem.mixDate)}</span>
                  {chem.expirationDate && (
                    <span>Expires {DATE_FORMATTER.format(chem.expirationDate)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {isConfirming ? (
                  <>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={isDeleting}
                      className="press-feedback p-2 text-accent-red hover:text-white transition-colors disabled:opacity-60"
                      aria-label={`Confirm delete ${chem.name}`}
                      title="Confirm Delete"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={onCancelDelete}
                      className="press-feedback p-2 text-ui-gray hover:text-white transition-colors"
                      aria-label="Cancel delete"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="press-feedback p-2 text-ui-gray hover:text-white transition-colors"
                      aria-label={`Edit ${chem.name}`}
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={onConfirmDelete}
                      className="press-feedback p-2 text-ui-gray hover:text-accent-red transition-colors"
                      aria-label={`Delete ${chem.name}`}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Roll count row */}
            <div className="flex items-center gap-3 border-t border-dark-border pt-3">
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ui-gray">Rolls Developed</p>
                <p className={cn(
                  'text-lg font-bold font-mono',
                  warning === 'rolls' ? 'text-amber-300' : 'text-white',
                )}>
                  {chem.rollCount}
                  {chem.maxRolls !== null && (
                    <span className="text-ui-gray text-sm font-normal"> / {chem.maxRolls}</span>
                  )}
                </p>
                {chem.maxRolls !== null && (
                  <div className="h-1 w-full bg-dark-border mt-1.5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        warning === 'rolls' ? 'bg-amber-400' : 'bg-accent-red',
                      )}
                      style={{ width: `${Math.min(100, (chem.rollCount / chem.maxRolls) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onIncrement}
                className="press-feedback flex items-center gap-1.5 border border-dark-border px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-ui-gray hover:text-white hover:border-white/40 transition-colors shrink-0"
                aria-label={`Increment roll count for ${chem.name}`}
                title="Add one roll"
              >
                <Plus size={12} />
                Roll
              </button>
            </div>

            {chem.notes && (
              <p className="text-xs text-ui-gray leading-relaxed border-t border-dark-border pt-3">
                {chem.notes}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

export const ChemsView: React.FC<ChemsViewProps> = ({
  chems,
  onAdd,
  onUpdate,
  onDelete,
  onIncrement,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddChemFormData>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameOptions = useMemo(
    () => getChemNameOptions(form.type, form.processMode),
    [form.processMode, form.type],
  );

  const setField = <K extends keyof AddChemFormData>(key: K, value: AddChemFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsAdding(true);
    try {
      const mixTs = parseDateInput(form.mixDate) ?? Date.now();
      const expiryTs = form.expirationDate ? parseDateInput(form.expirationDate) : null;
      const maxRolls = form.maxRolls ? parseInt(form.maxRolls, 10) || null : null;

      await onAdd({
        name: form.name.trim(),
        type: form.type,
        processMode: form.processMode,
        mixDate: mixTs,
        expirationDate: expiryTs,
        rollCount: 0,
        maxRolls,
        notes: form.notes.trim(),
      });

      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId((current) => (current === id ? null : current));
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className={cn(
            'press-feedback flex items-center gap-2 border px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors',
            showAddForm
              ? 'border-white/40 text-white'
              : 'border-dark-border text-ui-gray hover:text-white hover:border-white/40',
          )}
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Add Chemistry'}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <form
              onSubmit={(e) => void handleAdd(e)}
              className="utilitarian-border bg-dark-panel p-4 md:p-6 space-y-4 overflow-hidden"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">New Chemistry</h3>

              {/* Name */}
              <div className="space-y-1">
                <SearchableField
                  label="Name *"
                  options={nameOptions}
                  placeholder={form.type === 'developer' ? 'e.g. HC-110, Rodinal' : 'e.g. Ilford Rapid Fixer'}
                  value={form.name}
                  onChange={(value) => setField('name', value)}
                />
              </div>

              {/* Type + Process */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="mono-label">Type</label>
                  <div className="grid grid-cols-2 border border-dark-border">
                    {(['developer', 'fixer'] as ChemType[]).map((t, i) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField('type', t)}
                        className={cn(
                          'press-feedback px-3 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors',
                          i === 0 ? 'border-r border-dark-border' : '',
                          form.type === t
                            ? 'bg-white text-black'
                            : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]',
                        )}
                        aria-pressed={form.type === t}
                      >
                        {TYPE_BUTTON_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="mono-label">Process</label>
                  <div className="grid grid-cols-3 border border-dark-border">
                    {(['bw', 'color', 'neutral'] as ChemProcessMode[]).map((p, i) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setField('processMode', p)}
                        className={cn(
                          'press-feedback px-2 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors',
                          i < 2 ? 'border-r border-dark-border' : '',
                          form.processMode === p
                            ? 'bg-white text-black'
                            : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]',
                        )}
                        aria-pressed={form.processMode === p}
                      >
                        {PROCESS_MODE_BUTTON_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 min-w-0 overflow-hidden">
                  <label className="mono-label">Mixed Date *</label>
                  <input
                    type="date"
                    value={form.mixDate}
                    onChange={(e) => setField('mixDate', e.target.value)}
                    className="utilitarian-input mobile-form-control-inline w-full px-2"
                    required
                  />
                </div>
                <div className="space-y-1 min-w-0 overflow-hidden">
                  <label className="mono-label">Expiration Date</label>
                  <input
                    type="date"
                    value={form.expirationDate}
                    onChange={(e) => setField('expirationDate', e.target.value)}
                    className="utilitarian-input mobile-form-control-inline w-full px-2"
                  />
                </div>
              </div>

              {/* Max rolls */}
              <div className="space-y-1">
                <label className="mono-label">Capacity (max rolls)</label>
                <input
                  type="number"
                  value={form.maxRolls}
                  onChange={(e) => setField('maxRolls', e.target.value)}
                  className="utilitarian-input mobile-form-control-inline w-full md:w-40"
                  placeholder="e.g. 24"
                  min="1"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="mono-label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="utilitarian-input mobile-form-control-inline w-full resize-none"
                  rows={2}
                  placeholder="Dilution, batch number, temperature…"
                />
              </div>

              <button
                type="submit"
                disabled={isAdding || !form.name.trim()}
                className="utilitarian-button px-6 py-3 w-full sm:w-auto disabled:opacity-60"
              >
                {isAdding ? 'Adding…' : 'Add Chemistry'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chem list */}
      {chems.length === 0 && !showAddForm ? (
        <EmptyState
          icon={FlaskConical}
          title="No chemistry tracked yet"
          subtitle="Add a developer or fixer to track its age, roll count, and expiration."
          className="max-w-2xl"
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {chems.map((chem) => (
              <ChemCard
                key={chem.id}
                chem={chem}
                warning={getChemWarning(chem)}
                onIncrement={() => void onIncrement(chem.id)}
                onUpdate={(patch) => onUpdate(chem.id, patch)}
                onDelete={() => void handleDelete(chem.id)}
                isDeleting={deletingId === chem.id}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={() => setConfirmDeleteId(chem.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

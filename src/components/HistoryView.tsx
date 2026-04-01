import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock3, XCircle } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { cn, formatTime } from '../lib/utils';
import { formatTemperature, getProcessLabel, type Session } from '../services/recipe';

interface HistoryViewProps {
  sessions: Session[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STATUS_META = {
  completed: {
    label: 'Completed',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    Icon: CheckCircle2,
  },
  partial: {
    label: 'Partial',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    Icon: AlertTriangle,
  },
  aborted: {
    label: 'Aborted',
    className: 'border-accent-red/40 bg-accent-red/10 text-accent-red',
    Icon: XCircle,
  },
} as const;

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions }) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No session history yet"
        subtitle="Run a development timer to build a local record of completed, partial, and aborted sessions."
        className="max-w-3xl"
      />
    );
  }

  return (
    <section aria-label="Session history" className="w-full max-w-3xl space-y-4">
      <AnimatePresence initial={false}>
        {sessions.map((session) => {
          const expanded = expandedId === session.id;
          const status = STATUS_META[session.status];
          const durationSeconds = Math.max(0, Math.round((session.endTime - session.startTime) / 1000));
          const StatusIcon = status.Icon;

          return (
            <motion.article
              key={session.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="utilitarian-border bg-dark-panel overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId((current) => (current === session.id ? null : session.id))}
                className="press-feedback flex w-full items-start justify-between gap-4 p-4 text-left md:p-5"
                aria-expanded={expanded}
              >
                <div className="min-w-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold uppercase tracking-tight text-white">
                        {session.recipe.film}
                      </h3>
                      <span className={cn('inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em]', status.className)}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-accent-red">
                      {session.recipe.developer} • {session.recipe.dilution} • ISO {session.recipe.iso}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono uppercase tracking-widest text-ui-gray">
                    <span>{DATE_FORMATTER.format(session.startTime)}</span>
                    <span>{formatTime(durationSeconds)}</span>
                    <span>{session.phasesCompleted}/{session.recipe.phases.length} phases</span>
                    <span>{getProcessLabel(session.recipe.processMode)}</span>
                  </div>
                </div>

                <div className="mt-1 shrink-0 text-ui-gray">
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    key="details"
                    layout
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-dark-border"
                  >
                    <div className="space-y-5 p-4 md:p-5">
                      <div className="grid gap-4 text-xs font-mono uppercase tracking-widest text-ui-gray md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="mono-label">Started</p>
                          <p>{DATE_FORMATTER.format(session.startTime)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="mono-label">Finished</p>
                          <p>{DATE_FORMATTER.format(session.endTime)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="mono-label">Duration</p>
                          <p>{formatTime(durationSeconds)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="mono-label">Temperature</p>
                          <p>{formatTemperature(session.recipe.tempC)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="mono-label">Phases</p>
                        <div className="space-y-2">
                          {session.recipe.phases.map((phase, index) => (
                            <div
                              key={`${session.id}-${phase.name}-${index}`}
                              className="flex items-start justify-between gap-3 border border-dark-border bg-black/20 px-3 py-2"
                            >
                              <div className="min-w-0 space-y-1">
                                <p className="text-xs font-mono uppercase tracking-widest text-white">
                                  {phase.name}
                                </p>
                                {phase.agitation ? (
                                  <p className="text-xs leading-relaxed text-ui-gray">{phase.agitation}</p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-xs font-mono uppercase tracking-widest text-ui-gray">
                                {formatTime(phase.duration)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {session.recipe.notes ? (
                        <div className="space-y-1">
                          <p className="mono-label">Recipe Notes</p>
                          <p className="text-sm leading-relaxed text-ui-gray">{session.recipe.notes}</p>
                        </div>
                      ) : null}

                      {session.recipe.source ? (
                        <div className="space-y-1">
                          <p className="mono-label">Source</p>
                          <p className="text-sm leading-relaxed text-ui-gray">{session.recipe.source}</p>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </section>
  );
};

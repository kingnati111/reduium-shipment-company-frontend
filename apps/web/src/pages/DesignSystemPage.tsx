import { SHIPMENT_STATUSES, STATUS_INFO } from '@reduium/shared';
import { useState, type ReactNode } from 'react';
import { Logo, LogoMark } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { TextAreaField, TextField } from '../components/ui/Field';
import { Panel } from '../components/ui/Panel';
import { CompanyValue } from '../components/ui/Placeholder';
import { StatusBadge } from '../components/ui/StatusBadge';
import { company } from '../config/company';
import { TrackingForm } from '../features/tracking/TrackingForm';

/**
 * Stage 1 deliverable: the Reduium design system in one page.
 * Internal reference only. Not linked from the public site.
 */
export function DesignSystemPage() {
  const [tracked, setTracked] = useState<string | null>(null);

  return (
    <div className="min-h-dvh pb-24">
      <header className="bg-ink text-paper">
        <Container className="flex flex-col gap-10 py-14 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <Logo tone="paper" />
            <span className="type-label hidden rounded-xs border border-paper/25 px-2 py-1 whitespace-nowrap text-fog sm:inline-block">
              Design system · Stage 1
            </span>
          </div>
          <div className="max-w-3xl">
            <p className="type-label mb-4 text-signal">The manifest</p>
            <h1 className="type-display text-4xl sm:text-6xl">Every shipment, accounted for.</h1>
            <p className="mt-6 max-w-xl text-lg text-fog">
              The visual building blocks for the Reduium website, tracking interface and admin
              dashboard. Every page is assembled from these pieces.
            </p>
          </div>
          <div className="max-w-2xl">
            <TrackingForm size="hero" surface="dark" onTrack={setTracked} />
            {tracked && (
              <p className="text-sm text-fog" aria-live="polite">
                Format and check character valid:{' '}
                <span className="type-data text-paper">{tracked}</span>. Live lookup connects in
                Stage 4.
              </p>
            )}
          </div>
        </Container>
      </header>

      <Container className="mt-16 flex flex-col gap-20">
        <Section index="01" title="Brand mark">
          <div className="grid gap-4 sm:grid-cols-3">
            <Swatchbox className="bg-paper-50">
              <Logo />
            </Swatchbox>
            <Swatchbox className="bg-ink">
              <Logo tone="paper" />
            </Swatchbox>
            <Swatchbox className="bg-fog-200">
              <div className="flex items-end gap-5">
                <LogoMark className="size-16" title="Reduium mark" />
                <LogoMark className="size-10" />
                <LogoMark className="size-6" />
              </div>
            </Swatchbox>
          </div>
          <p className="mt-4 max-w-2xl text-ink-600">
            A route line turns a corner to form an <em>R</em>, ending at a Signal-orange waypoint:
            the delivery point. The orange dot appears in every version of the mark.
          </p>
        </Section>

        <Section index="02" title="Colour">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ColorChip
              name="Ink"
              hex="#0B1626"
              className="bg-ink text-paper"
              role="Text, header, footer"
            />
            <ColorChip
              name="Harbor"
              hex="#16344F"
              className="bg-harbor text-paper"
              role="Panels, admin"
            />
            <ColorChip
              name="Paper"
              hex="#F5F2EB"
              className="bg-paper text-ink border border-fog"
              role="Page background"
            />
            <ColorChip
              name="Fog"
              hex="#D9D4C7"
              className="bg-fog text-ink"
              role="Borders, dividers"
            />
            <ColorChip
              name="Signal"
              hex="#FF5A1F"
              className="bg-signal text-ink"
              role="Actions & live state only"
            />
          </div>
        </Section>

        <Section index="03" title="Typography">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-5">
              <Specimen label="Display · Archivo Expanded 750">
                <span className="type-display text-5xl">Port to door.</span>
              </Specimen>
              <Specimen label="Heading · Archivo 650">
                <span className="text-2xl font-[650] tracking-tight">
                  Ocean, air and road freight
                </span>
              </Specimen>
              <Specimen label="Body · Archivo 400">
                <span className="text-base leading-relaxed text-ink-600">
                  Packages are scanned at every handover, so the record you see is the record we
                  keep.
                </span>
              </Specimen>
            </div>
            <div className="flex flex-col gap-5">
              <Specimen label="Data · IBM Plex Mono">
                <span className="type-data text-2xl">RDM-7K4P-9X2Q-R</span>
              </Specimen>
              <Specimen label="Timestamp">
                <span className="type-data text-ink-600">
                  2026-11-22 · 14:05 UTC · Rotterdam, NL
                </span>
              </Specimen>
              <Specimen label="Field label">
                <span className="type-label text-ink-600">Consignee / Destination</span>
              </Specimen>
            </div>
          </div>
        </Section>

        <Section index="04" title="Shipment status stamps">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {SHIPMENT_STATUSES.map((s) => (
              <div key={s} className="flex flex-col items-start gap-1.5 border-t border-fog py-3">
                <StatusBadge status={s} />
                <span className="text-sm text-ink-400">{STATUS_INFO[s].description}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section index="05" title="Actions">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Track package</Button>
            <Button variant="secondary">Create shipment</Button>
            <Button variant="outline">View history</Button>
            <Button variant="ghost">Cancel</Button>
            <Button size="sm" variant="outline">
              Small
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 inline-flex rounded-md bg-ink p-4">
            <Button variant="inverse">On dark</Button>
          </div>
        </Section>

        <Section index="06" title="Forms & panels">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel label="Support request" reference="Sample form">
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <TextField label="Full name" placeholder="Jane Doe" autoComplete="name" />
                <TextField
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <TextField label="Tracking number (optional)" mono placeholder="RDM-XXXX-XXXX-X" />
                <TextField
                  label="Example error"
                  defaultValue="not-an-email"
                  error="Please enter a valid email address."
                />
                <TextAreaField label="Message" placeholder="How can we help?" />
                <p className="text-sm text-ink-400">
                  Sample only. The working contact form is on the Support page.
                </p>
              </form>
            </Panel>
            <Panel label="Company details" reference="config/company.ts">
              <dl className="flex flex-col divide-y divide-fog">
                {Object.entries(company.contact).map(([key, field]) => (
                  <div key={key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <dt className="type-label text-ink-400">{key}</dt>
                    <dd className="text-ink">
                      <CompanyValue field={field} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </Section>
      </Container>
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex items-baseline gap-4">
        <span className="type-data text-sm text-signal">{index}</span>
        <h2 className="text-2xl font-[680] tracking-tight [font-stretch:112%]">{title}</h2>
      </div>
      <hr className="rule-perforated mb-8" />
      {children}
    </section>
  );
}

function Swatchbox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-36 items-center justify-center rounded-md border border-fog ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

function ColorChip({
  name,
  hex,
  role,
  className,
}: {
  name: string;
  hex: string;
  role: string;
  className: string;
}) {
  return (
    <div className={`flex h-32 flex-col justify-between rounded-md p-4 ${className}`}>
      <span className="font-semibold">{name}</span>
      <span className="flex flex-col gap-0.5">
        <span className="type-data text-sm">{hex}</span>
        <span className="text-xs opacity-75">{role}</span>
      </span>
    </div>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-fog pt-3">
      <span className="type-label text-ink-400">{label}</span>
      {children}
    </div>
  );
}

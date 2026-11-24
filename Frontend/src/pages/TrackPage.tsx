import { normalizeTrackingNumber } from '@reduium/shared';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { useLocalePath } from '../i18n/locale-context';
import { TrackingForm } from '../features/tracking/TrackingForm';
import { TrackingHistory } from '../features/tracking/TrackingHistory';
import {
  TrackingError,
  TrackingIntro,
  TrackingInvalid,
  TrackingLoading,
  TrackingNotFound,
  TrackingRateLimited,
} from '../features/tracking/TrackingStates';
import { TrackingSummary } from '../features/tracking/TrackingSummary';
import { useTrackingLookup } from '../features/tracking/useTrackingLookup';

const SEARCH_INPUT_ID = 'track-page-input';

/**
 * Tracking results page: /track/:trackingNumber
 *
 * The number in the address is checked in the browser first (instant
 * feedback, no wasted request), then looked up through the API. Every
 * outcome has its own state: loading, found, not found, invalid, rate
 * limited, or error with a retry button. Nothing is shown that the API
 * didn't return.
 */
export function TrackPage() {
  const { trackingNumber: raw = '' } = useParams();
  const navigate = useNavigate();
  const localePath = useLocalePath();
  const { t } = useTranslation('tracking');
  const { t: tShipment } = useTranslation('shipment');
  const normalized = raw ? normalizeTrackingNumber(raw) : null;
  const { outcome, loading, retry } = useTrackingLookup(normalized);

  function searchAnother() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    input?.focus({ preventScroll: true });
    input?.select();
  }

  // One polite announcement for screen readers whenever the result changes.
  const announcement = !normalized
    ? ''
    : loading
      ? t('announce.looking', { trackingNumber: normalized })
      : outcome?.kind === 'found'
        ? t('announce.found', {
            trackingNumber: normalized,
            status: tShipment(`status.${outcome.shipment.status}.label`),
          })
        : outcome?.kind === 'not-found'
          ? t('announce.notFound', { trackingNumber: normalized })
          : outcome?.kind === 'rate-limited'
            ? t('announce.rateLimited')
            : outcome?.kind === 'error' || outcome?.kind === 'invalid'
              ? t('announce.failed')
              : '';

  return (
    <>
      <title>
        {normalized
          ? t('documentTitleWithNumber', { trackingNumber: normalized })
          : t('documentTitle')}
      </title>
      {/* Tracking pages are personal: keep them out of search engines. */}
      <meta name="robots" content="noindex" />

      <section className="bg-ink text-paper">
        <Container className="py-10 sm:py-14">
          <h1 className="type-display mb-6 text-3xl sm:mb-8 sm:text-5xl">{t('heading')}</h1>
          <TrackingForm
            key={raw}
            size="hero"
            surface="dark"
            className="max-w-2xl"
            inputId={SEARCH_INPUT_ID}
            defaultValue={normalized ?? raw}
            onTrack={(tn) => navigate(localePath(`/track/${tn}`))}
          />
        </Container>
      </section>

      <Container className="max-w-5xl py-10 sm:py-14">
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {!raw && <TrackingIntro />}
        {raw && !normalized && <TrackingInvalid />}
        {normalized && loading && <TrackingLoading trackingNumber={normalized} />}

        {normalized && outcome?.kind === 'found' && (
          <div className="space-y-8">
            <TrackingSummary shipment={outcome.shipment} />
            <TrackingHistory events={outcome.shipment.events} />
            <div className="flex justify-center">
              <Button variant="outline" onClick={searchAnother}>
                <Search aria-hidden className="size-4" />
                {t('trackAnother')}
              </Button>
            </div>
          </div>
        )}
        {normalized && outcome?.kind === 'not-found' && (
          <TrackingNotFound trackingNumber={normalized} />
        )}
        {normalized && outcome?.kind === 'invalid' && <TrackingInvalid />}
        {normalized && outcome?.kind === 'rate-limited' && (
          <TrackingRateLimited retryAfterSeconds={outcome.retryAfterSeconds} />
        )}
        {normalized && outcome?.kind === 'error' && <TrackingError onRetry={retry} />}
      </Container>
    </>
  );
}

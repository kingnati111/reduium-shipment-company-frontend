import { Link, useNavigate, useParams } from 'react-router';
import { buttonClasses } from '../../components/ui/button-styles';
import { AdminApiError } from '../../features/admin/api';
import {
  emptyShipmentForm,
  formToInput,
  shipmentToForm,
} from '../../features/admin/shipments/form-model';
import { ShipmentForm } from '../../features/admin/shipments/ShipmentForm';
import { useLoad, useShipmentsApi } from '../../features/admin/shipments/api';
import { LoadProblem, Notice, PageHeader } from '../../features/admin/ui';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';

/** Turn an API error into field errors (for the form) or a message (for the page). */
function interpret(error: unknown): { fields?: Record<string, string>; message: string } {
  if (error instanceof AdminApiError) {
    const fields = Object.fromEntries(error.issues.map((i) => [i.field, i.message]));
    return { fields: Object.keys(fields).length ? fields : undefined, message: error.message };
  }
  return { message: 'Something went wrong. Please try again.' };
}

export function NewShipmentPage() {
  const api = useShipmentsApi();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <>
      <title>New shipment | Reduium Admin</title>
      <PageHeader
        eyebrow="Shipments"
        title="New shipment"
        description="A tracking number is created automatically when you save."
      />
      <div className="mt-8">
        <ShipmentForm
          initial={emptyShipmentForm()}
          submitLabel="Create shipment"
          busyLabel="Creating…"
          formError={problem && <Notice tone="critical">{problem}</Notice>}
          cancel={
            <Link to="/admin/shipments" className={buttonClasses('ghost', 'lg')}>
              Cancel
            </Link>
          }
          onSubmit={async (form) => {
            setProblem(null);
            try {
              const created = await api.create(formToInput(form));
              navigate(`/admin/shipments/${created.id}`, {
                state: { flash: `Shipment ${created.trackingNumber} created.` },
              });
            } catch (error) {
              const { fields, message } = interpret(error);
              if (fields) return fields;
              setProblem(message);
            }
          }}
        />
      </div>
    </>
  );
}

export function EditShipmentPage() {
  const { id = '' } = useParams();
  const api = useShipmentsApi();
  const navigate = useNavigate();
  const { state, reload } = useLoad((signal) => api.get(id, signal), [id, api]);
  const [problem, setProblem] = useState<{ message: string; stale: boolean } | null>(null);

  if (state.kind !== 'ok') return <LoadProblem state={state} onRetry={reload} />;
  const shipment = state.data;

  let formError: ReactNode = null;
  if (problem) {
    formError = (
      <Notice tone="critical">
        {problem.message}{' '}
        {problem.stale && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => {
              setProblem(null);
              reload();
            }}
          >
            Load the latest version
          </Button>
        )}
      </Notice>
    );
  }

  return (
    <>
      <title>{`Edit ${shipment.trackingNumber} | Reduium Admin`}</title>
      <PageHeader
        eyebrow="Edit shipment"
        title={<span className="type-data">{shipment.trackingNumber}</span>}
        description="Status and location change through tracking updates on the shipment page, so the history always stays complete."
      />
      {shipment.archivedAt ? (
        <div className="mt-8">
          <Notice tone="caution">This shipment is archived. Restore it before editing.</Notice>
        </div>
      ) : (
        <div className="mt-8">
          <ShipmentForm
            key={shipment.updatedAt}
            initial={shipmentToForm(shipment)}
            submitLabel="Save changes"
            busyLabel="Saving…"
            formError={formError}
            cancel={
              <Link to={`/admin/shipments/${shipment.id}`} className={buttonClasses('ghost', 'lg')}>
                Cancel
              </Link>
            }
            onSubmit={async (form) => {
              setProblem(null);
              try {
                await api.update(shipment.id, {
                  ...formToInput(form),
                  expectedUpdatedAt: shipment.updatedAt,
                });
                navigate(`/admin/shipments/${shipment.id}`, { state: { flash: 'Changes saved.' } });
              } catch (error) {
                const { fields, message } = interpret(error);
                if (fields) return fields;
                setProblem({
                  message,
                  stale: error instanceof AdminApiError && error.status === 409,
                });
              }
            }}
          />
        </div>
      )}
    </>
  );
}

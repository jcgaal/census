import type { Formatter } from './types';
import { page } from './util';

// HubSpot stores first and last names in separate fields. The first
// word becomes the first name and the rest the last name, which
// is a guess, as any automatic split of a full name must be.
function splitName(name: unknown): { firstname?: string; lastname?: string } {
  if (typeof name !== 'string' || !name.trim()) return {};
  const [first, ...rest] = name.trim().split(/\s+/);
  return { firstname: first, lastname: rest.length ? rest.join(' ') : undefined };
}

// HubSpot needs a contact before it can hold that person's activity.
// Until the visitor identifies there is only the timeline event,
// which HubSpot attaches to the contact by email once it exists.
export const hubspot: Formatter = (input, t) => {
  const e = input.event;
  const traits = input.identify?.traits;
  const contact = traits
    ? {
        request: 'POST https://api.hubapi.com/crm/v3/objects/contacts',
        properties: { email: traits.email, ...splitName(traits.name), company: traits.company || undefined },
      }
    : t.hubspotNoContact;
  // The timeline event template is created inside each HubSpot account,
  // so its ID stays a placeholder a real integration would fill in, and
  // the preview shows the shape without pointing at any real portal.
  const timeline = e && {
    request: 'POST https://api.hubapi.com/integrators/timeline/v3/events',
    eventTemplateId: '<your-event-template-id>',
    email: traits?.email ?? null,
    timestamp: e.timestamp,
    tokens: {
      event: e.type === 'page' ? 'Page Viewed' : e.event,
      page_path: page(e).path,
    },
    extraData: e.properties,
  };
  return {
    name: 'HubSpot',
    endpoint: t.hubspotEndpoint,
    body: { contact, timelineEvent: timeline },
  };
};

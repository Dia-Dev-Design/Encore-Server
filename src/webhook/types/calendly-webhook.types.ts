export enum CalendlyEventType {
  INVITEE_CREATED = 'invitee.created',
  INVITEE_CANCELED = 'invitee.canceled',
  INVITEE_RESCHEDULED = 'invitee.rescheduled',
}

export interface CalendlyWebhookPayload {
  event: string;
  created_at: string;
  payload: {
    event_type: {
      name: string;
      uuid: string;
    };
    scheduled_event: {
      uri: string;
      name: string;
      start_time: string;
      end_time: string;
      location: {
        type: string;
        location?: string;
        join_url: string;
      };
    };
    email: string;
    name: string;
    first_name: string;
    last_name: string;
    timezone: string;
    status: 'active' | 'canceled';
    questions_and_answers: Array<{
      question: string;
      answer: string;
    }>;
    cancel_url: string;
    reschedule_url: string;
  };
}

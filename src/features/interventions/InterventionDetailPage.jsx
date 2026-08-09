import { ArrowLeft, Clock3, Monitor } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, Page, Section } from "../../components/layout";
import {
  getInterventionById,
  getInterventionGuidance,
} from "../../data/resources/interventions";
import ResourceMemoryControls from "../resource-memory/ResourceMemoryControls";
import "./InterventionsPage.css";

function ListSection({ items, title }) {
  if (!items.length) return null;
  return (
    <Section className="intervention-detail__section" title={title}>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Section>
  );
}

export default function InterventionDetailPage({
  interventionId: suppliedId,
  memoryRepository,
}) {
  const { interventionId: routeId } = useParams();
  const interventionId = suppliedId ?? routeId;
  const intervention = getInterventionById(interventionId);
  const guidance = getInterventionGuidance(interventionId);

  if (!intervention || !guidance) {
    return (
      <Page
        description="That Intervention is unavailable or the link may be outdated."
        title="Intervention Not Found"
      >
        <EmptyState
          action={
            <Link className="studio-button studio-button--primary" to="/interventions">
              Back to Interventions
            </Link>
          }
          description="Browse the current library to choose another clinical activity."
          title="We Couldn’t Find That Intervention"
        />
      </Page>
    );
  }

  return (
    <Page
      actions={
        <Link className="studio-button studio-button--secondary" to="/interventions">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to Interventions
        </Link>
      }
      className="intervention-detail"
      description={intervention.description}
      eyebrow="Intervention"
      title={intervention.title}
    >
      <section className="intervention-detail__quick-fit" aria-label="Quick fit">
        {intervention.durationMinutes ? (
          <span>
            <Clock3 aria-hidden="true" size={17} />
            {intervention.durationMinutes} minutes
          </span>
        ) : null}
        {intervention.telehealthFriendly ? (
          <span>
            <Monitor aria-hidden="true" size={17} />
            Telehealth friendly
          </span>
        ) : null}
        {intervention.ageRanges.length ? (
          <span>Ages {intervention.ageRanges.join(", ")}</span>
        ) : null}
        {intervention.materials.length ? (
          <span>Materials: {intervention.materials.join(", ")}</span>
        ) : null}
      </section>

      <ResourceMemoryControls
        allowMarkUsed
        repository={memoryRepository}
        resourceId={intervention.id}
        showEditor
        therapistOnly
      />

      <Section className="intervention-detail__overview" title="What This Is">
        <p>{guidance.overview}</p>
      </Section>
      <ListSection items={guidance.whenToUse} title="When to Use It" />
      <Section className="intervention-detail__introduction" title="How to Introduce It">
        <blockquote>“{guidance.introduction}”</blockquote>
      </Section>
      <Section className="intervention-detail__section" title="What to Do">
        <ol>
          {guidance.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>
      <ListSection items={guidance.therapistPrompts} title="Therapist Prompts" />
      <ListSection items={guidance.processingQuestions} title="Questions for Afterward" />
      <ListSection items={guidance.adaptations} title="Adaptations" />
      <ListSection items={guidance.cautions} title="Considerations" />
      <Section className="intervention-detail__source" title="Source Status">
        <p>{guidance.sourceStatus}</p>
      </Section>
    </Page>
  );
}

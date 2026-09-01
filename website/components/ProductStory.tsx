"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileVideo,
  FolderKanban,
  MessageSquare,
  Pause,
  Play,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState } from "react";
import GradientBlinds from "./react-bits/GradientBlinds";
import { MagicBentoSurface } from "./react-bits/MagicBento";
import SpecularButton from "./react-bits/SpecularButton";
import SplitText from "./react-bits/SplitText";
import Stepper, { Step } from "./react-bits/Stepper";

const workflowStages = ["Plan", "Edit", "Client review", "Deliver"] as const;

const comments = [
  {
    id: 1,
    author: "Maya Chen",
    time: "00:07",
    text: "Can we hold this shot for half a second longer?",
    seconds: 7,
  },
  {
    id: 2,
    author: "Jordan Patel",
    time: "00:16",
    text: "Love the pace here.",
    seconds: 16,
  },
  {
    id: 3,
    author: "Alex Rivera",
    time: "00:24",
    text: "Let's brighten the midtones just a touch.",
    seconds: 24,
  },
  {
    id: 4,
    author: "Samir Khan",
    time: "00:38",
    text: "Can we soften the highlights on the road?",
    seconds: 38,
  },
] as const;

const deliverySteps = [
  { label: "Export master", status: "Master file ready", icon: Download },
  { label: "Upload review", status: "Review version online", icon: Upload },
  { label: "Client approval", status: "Approved by Maya", icon: MessageSquare },
  { label: "Final delivery", status: "Handoff confirmed", icon: CheckCircle2 },
] as const;

const plans = [
  {
    name: "Free",
    price: "$0",
    billing: "forever",
    annual: null,
    trial: null,
    description: "For freelancers getting their workflow organized.",
    features: [
      "Unlimited Projects and Clients",
      "Project tracking, reviews, and delivery",
      "Client Portals",
      "External video embeds",
    ],
    note: null,
    cta: "Join waitlist",
  },
  {
    name: "Creator",
    price: "$9",
    billing: "/ month",
    annual: "$90 / year",
    trial: "7-day free trial",
    description: "For freelance editors running their business in Relay.",
    features: [
      "Everything in Free",
      "5 GB of file storage",
      "Custom Workflow Templates",
      "Salary Plans and advanced reports",
      "Client Hub and custom portal branding",
    ],
    note: null,
    cta: "Join waitlist",
  },
  {
    name: "Team",
    price: "$24",
    billing: "/ month",
    annual: "$240 / year",
    trial: null,
    description: "For small editing teams managing shared work.",
    features: [
      "Everything in Creator",
      "Three editing seats",
      "15 GB of shared storage",
      "Roles and Project assignments",
      "Team payouts and workload reports",
      "Free Viewer access",
    ],
    note: "Extra Editor seats cost $5/month and add 2 GB of shared storage.",
    cta: "Join waitlist",
  },
] as const;

const proofEvents = [
  {
    kind: "Project",
    action: "Project created",
    project: "Summer launch film",
    detail: "",
    time: "9:02 AM",
    owner: "Jordan",
  },
  {
    kind: "Project",
    action: "Status changed",
    project: "Summer launch film",
    detail: "In production",
    time: "9:04 AM",
    owner: "Jordan",
  },
  {
    kind: "Review",
    action: "Comment added",
    project: "Summer launch film",
    detail: "Tighten the cut here.",
    time: "9:15 AM",
    owner: "Priya",
  },
  {
    kind: "Review",
    action: "Version added",
    project: "Summer launch film",
    detail: "v3.mp4",
    time: "10:11 AM",
    owner: "Alex",
  },
  {
    kind: "Delivery",
    action: "Deliverable status changed",
    project: "Field Notes episode 12",
    detail: "Delivered",
    time: "11:32 AM",
    owner: "Jordan",
  },
] as const;

const proofWeeks = [
  {
    label: "Apr 28 – May 4",
    projects: [
      {
        day: "Tue, Apr 29",
        name: "Product teaser",
        type: "Video · Product",
        due: "Apr 29\n4:00 PM",
        review: "Needs review",
        status: "In review",
      },
      {
        day: "Fri, May 2",
        name: "Campaign cutdowns",
        type: "Video · Social",
        due: "May 2\n2:00 PM",
        review: "Complete",
        status: "Delivered",
      },
    ],
  },
  {
    label: "May 5 – May 11",
    projects: [
      {
        day: "Mon, May 5",
        name: "Summer launch film",
        type: "Video · Campaign",
        due: "May 5\n5:00 PM",
        review: "Needs review",
        status: "In production",
      },
      {
        day: "Tue, May 6",
        name: "Q2 team reel",
        type: "Video · Social",
        due: "May 6\n3:00 PM",
        review: "Complete",
        status: "Delivered",
      },
      {
        day: "Wed, May 7",
        name: "Founder story cutdown",
        type: "Video · Brand",
        due: "May 7\n10:00 AM",
        review: "Needs review",
        status: "In review",
      },
      {
        day: "Thu, May 8",
        name: "Field Notes episode 12",
        type: "Video · Editorial",
        due: "May 8\n11:00 AM",
        review: "Complete",
        status: "Delivered",
      },
    ],
  },
  {
    label: "May 12 – May 18",
    projects: [
      {
        day: "Mon, May 12",
        name: "Aperture Coffee profile",
        type: "Video · Brand",
        due: "May 12\n1:00 PM",
        review: "Needs review",
        status: "In production",
      },
      {
        day: "Thu, May 15",
        name: "Orbit Labs demo",
        type: "Video · Product",
        due: "May 15\n6:00 PM",
        review: "Not started",
        status: "Planning",
      },
    ],
  },
] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <SplitText
      text={children}
      tag="h2"
      className="story-title"
      splitType="words"
      delay={45}
      duration={0.7}
      textAlign="left"
      from={{ opacity: 0, y: 28 }}
      to={{ opacity: 1, y: 0 }}
    />
  );
}

export default function ProductStory() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [commentId, setCommentId] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(43);
  const [deliveryStep, setDeliveryStep] = useState(3);
  const [proofFilter, setProofFilter] = useState("All events");
  const [proofWeek, setProofWeek] = useState(1);
  const comment = comments.find((item) => item.id === commentId) ?? comments[0];
  const visibleProofEvents =
    proofFilter === "All events"
      ? proofEvents
      : proofEvents.filter((event) => event.kind === proofFilter);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const selectComment = (id: number, seconds: number) => {
    setCommentId(id);
    if (videoRef.current) videoRef.current.currentTime = seconds;
  };

  return (
    <div className="product-story">
      <section
        className="story-section workflow-story"
        id="workflow"
        aria-label="Workflow"
      >
        <div className="story-heading">
          <p className="story-index">01 / Workflow</p>
          <SectionTitle>One production line.</SectionTitle>
          <p>
            Move from plan to delivery without rebuilding context at every
            handoff.
          </p>
        </div>

        <Stepper
          className="workflow-stepper"
          role="group"
          aria-label="Production stages"
          initialStep={2}
          stepCircleContainerClassName="workflow-stepper-shell"
          stepContainerClassName="workflow-stepper-nav"
          contentClassName="workflow-stepper-content"
          footerClassName="workflow-stepper-footer"
          renderStepIndicator={({ step, currentStep, onStepClick }) => (
            <button
              type="button"
              className={step === currentStep ? "is-active" : ""}
              onClick={() => onStepClick(step)}
              aria-current={step === currentStep ? "step" : undefined}
            >
              <small>0{step}</small>
              {workflowStages[step - 1]}
            </button>
          )}
        >
          <Step>
            <div className="stage-ledger">
              <div className="mini-bar">
                <strong>Project ledger</strong>
                <span>12 projects</span>
              </div>
              {[
                "Summer launch film",
                "Founder story cutdown",
                "Field Notes episode 12",
              ].map((project, index) => (
                <button
                  key={project}
                  type="button"
                  className={index === 1 ? "is-current" : ""}
                >
                  <span>
                    <i />
                    {project}
                  </span>
                  <small>
                    {index === 0 ? "May 5" : index === 1 ? "Today" : "May 11"}
                  </small>
                </button>
              ))}
            </div>
          </Step>
          <Step>
            <div className="mini-timeline" aria-hidden="true">
              <div className="mini-time">
                <span>00:00</span>
                <span>01:12</span>
              </div>
              <div className="mini-track track-video">
                {["Wide frame", "Close frame", "End frame"].map((frame) => (
                  <span key={frame}>
                    <Image
                      src="/images/runner-night-frame.png"
                      alt=""
                      fill
                      sizes="33vw"
                    />
                  </span>
                ))}
              </div>
              <div className="mini-track track-audio" />
              <div className="mini-playhead" />
            </div>
          </Step>
          <Step>
            <div className="stage-notes">
              <div className="mini-bar">
                <strong>Client review</strong>
                <span>3 notes</span>
              </div>
              <p>
                <b>00:18</b> Hold the wide shot.
              </p>
              <p>
                <b>00:37</b> Tighten transition.
              </p>
              <p>
                <Check size={12} /> Final frame approved.
              </p>
            </div>
          </Step>
          <Step>
            <div className="stage-delivery">
              <CheckCircle2 size={22} />
              <strong>Final_v12.mp4</strong>
              <span>Ready to deliver</span>
            </div>
          </Step>
        </Stepper>
      </section>

      <section
        className="story-section review-story"
        id="client-review"
        aria-label="Client review"
      >
        <div className="review-heading">
          <p className="story-index">02 / Client review</p>
          <h2 className="story-title">Feedback, on the frame.</h2>
          <p>Clients leave a note on the exact moment and the right version.</p>
        </div>

        <div className="review-room">
          <div className="review-room-bar">
            <span>
              <Image
                src="/brand/relay/mark-accent.svg"
                alt=""
                width={20}
                height={20}
              />
              Relay
            </span>
            <strong>v4 / Client review</strong>
            <span>{comments.length} comments</span>
          </div>
          <div className="review-room-grid">
            <div className="review-player">
              <video
                ref={videoRef}
                src="/videos/client-review-city.mp4"
                preload="metadata"
                playsInline
                muted={muted}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(event) =>
                  setCurrentTime(event.currentTarget.currentTime)
                }
                onLoadedMetadata={(event) =>
                  setDuration(event.currentTarget.duration)
                }
              />
              <div className="frame-note">
                <span>
                  {comment.time} · {comment.author}
                </span>
                {comment.text}
              </div>
              <div className="review-controls">
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={playing ? "Pause video" : "Play video"}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  aria-label={muted ? "Unmute video" : "Mute video"}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <span>
                  {Math.floor(currentTime / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {Math.floor(currentTime % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={currentTime}
                  aria-label="Video position"
                  onChange={(event) => {
                    const nextTime = Number(event.currentTarget.value);
                    setCurrentTime(nextTime);
                    if (videoRef.current)
                      videoRef.current.currentTime = nextTime;
                  }}
                />
                <span>00:43</span>
              </div>
            </div>
            <aside
              className="review-comments"
              aria-label="Client review comments"
            >
              <header>
                <span>Comments</span>
                <small>{comments.length} open</small>
              </header>
              {comments.map((item) => (
                <button
                  className={commentId === item.id ? "is-active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => selectComment(item.id, item.seconds)}
                >
                  <span>
                    {item.author}
                    <small>{item.time}</small>
                  </span>
                  <p>{item.text}</p>
                </button>
              ))}
            </aside>
          </div>
        </div>
      </section>

      <section
        className="story-section delivery-story"
        id="delivery"
        aria-label="Delivery"
      >
        <div className="delivery-copy">
          <p className="story-index">03 / Delivery</p>
          <div
            className="delivery-rail"
            role="group"
            aria-label="Delivery progress"
          >
            {deliverySteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`${index <= deliveryStep ? "is-complete" : ""}${index === deliveryStep ? " is-active" : ""}`}
                  onClick={() => setDeliveryStep(index)}
                >
                  <span className="delivery-step-icon">
                    <Icon size={15} />
                  </span>
                  <span className="delivery-step-copy">
                    <strong>{item.label}</strong>
                    <small>{item.status}</small>
                  </span>
                  <Check className="delivery-step-check" size={14} />
                </button>
              );
            })}
          </div>
          <SectionTitle>Ship the right cut.</SectionTitle>
          <p>One visible path from export to a confirmed handoff.</p>
        </div>
        <div className="delivery-preview">
          <div className="delivery-frame" aria-hidden="true">
            <Image
              className="delivery-image"
              src="/images/final-delivery-studio.png"
              alt=""
              fill
              sizes="(max-width: 980px) 100vw, 65vw"
            />
          </div>
          <div className="delivery-status">
            <span>
              <CheckCircle2 size={16} /> {deliverySteps[deliveryStep].label}
            </span>
            <strong>Final_v12.mp4</strong>
            <small>{deliverySteps[deliveryStep].status}</small>
          </div>
        </div>
      </section>

      <section
        className="story-section proof-story"
        id="proof"
        aria-label="Proof"
      >
        <div className="story-heading">
          <p className="story-index">04 / Proof</p>
          <SectionTitle>See what moved.</SectionTitle>
          <p>
            Recent changes and the week ahead stay visible without another
            status meeting.
          </p>
        </div>
        <MagicBentoSurface
          className="proof-workspace"
          spotlightRadius={360}
          glowColor="198, 255, 0"
          enableTilt={false}
          enableMagnetism={false}
          clickEffect={false}
        >
          <section className="proof-activity" aria-label="Project activity">
            <div className="proof-panel-head">
              <h3>Project activity</h3>
              <label>
                <span className="sr-only">Filter activity</span>
                <select
                  value={proofFilter}
                  onChange={(event) => setProofFilter(event.target.value)}
                >
                  <option>All events</option>
                  <option>Project</option>
                  <option>Review</option>
                  <option>Delivery</option>
                </select>
              </label>
            </div>
            <p className="proof-today">Today</p>
            <div className="proof-event-list">
              {visibleProofEvents.map((event) => {
                const EventIcon =
                  event.kind === "Review"
                    ? MessageSquare
                    : event.kind === "Delivery"
                      ? CheckCircle2
                      : FileVideo;
                return (
                  <article
                    className="proof-event"
                    key={`${event.action}-${event.time}`}
                  >
                    <span className="proof-event-icon">
                      <EventIcon size={13} />
                    </span>
                    <div>
                      <strong>{event.action}</strong>
                      <p>
                        {event.project}
                        {event.detail ? (
                          <>
                            {" "}
                            · <em>{event.detail}</em>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <small>
                      {event.time}
                      <br />
                      {event.owner}
                    </small>
                  </article>
                );
              })}
            </div>
            <button
              className="proof-panel-action"
              type="button"
              onClick={() => setProofFilter("All events")}
            >
              View all activity <ArrowRight size={14} />
            </button>
          </section>

          <section className="proof-ledger" aria-label="Projects due this week">
            <div className="proof-panel-head proof-week-head">
              <h3>Due this week</h3>
              <div>
                <button
                  type="button"
                  aria-label="Previous week"
                  disabled={proofWeek === 0}
                  onClick={() => setProofWeek((week) => Math.max(0, week - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{proofWeeks[proofWeek].label}</span>
                <button
                  type="button"
                  aria-label="Next week"
                  disabled={proofWeek === proofWeeks.length - 1}
                  onClick={() =>
                    setProofWeek((week) =>
                      Math.min(proofWeeks.length - 1, week + 1)
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="proof-ledger-head">
              <span>Project</span>
              <span>Due</span>
              <span>Review</span>
              <span>Status</span>
            </div>
            <div className="proof-project-list">
              {proofWeeks[proofWeek].projects.map((project) => (
                <div className="proof-project-group" key={project.name}>
                  <p>{project.day}</p>
                  <button type="button">
                    <span className="proof-project-name">
                      <FolderKanban size={16} />
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.type}</small>
                      </span>
                    </span>
                    <time>
                      {project.due.split("\n").map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </time>
                    <span className="proof-state">
                      <i
                        className={
                          project.review === "Complete" ? "is-complete" : ""
                        }
                      />
                      {project.review}
                    </span>
                    <span className="proof-state">
                      <i
                        className={
                          project.status === "Delivered" ? "is-complete" : ""
                        }
                      />
                      {project.status}
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <button
              className="proof-panel-action"
              type="button"
              onClick={() => setProofWeek(1)}
            >
              View current week <ArrowRight size={14} />
            </button>
          </section>
        </MagicBentoSurface>
      </section>

      <section
        className="story-section pricing-story"
        id="pricing"
        aria-label="Pricing"
      >
        <div className="story-heading">
          <p className="story-index">05 / Pricing</p>
          <SectionTitle>Plans for launch.</SectionTitle>
          <p>
            Early access storage, limits, and features may differ from these
            planned tiers.
          </p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`price-plan${plan.name === "Creator" ? " is-featured" : ""}`}
              key={plan.name}
            >
              {plan.name === "Creator" ? (
                <div className="plan-badge">Best value</div>
              ) : null}
              <span>{plan.name}</span>
              <strong>
                {plan.price}
                <small>{plan.billing}</small>
              </strong>
              <div className="plan-billing-meta">
                {plan.annual ? (
                  <div className="plan-status">or {plan.annual}</div>
                ) : null}
                {plan.trial ? (
                  <div className="plan-trial">{plan.trial}</div>
                ) : null}
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.note ? (
                <small className="plan-note">{plan.note}</small>
              ) : null}
              <SpecularButton href="/waitlist">
                {plan.cta} <ArrowRight size={15} />
              </SpecularButton>
            </article>
          ))}
        </div>
      </section>

      <footer className="story-footer">
        <GradientBlinds
          className="footer-gradient-blinds"
          gradientColors={["#C4FF9F", "#30FF27"]}
          angle={20}
          noise={0.5}
          blindCount={16}
          blindMinWidth={60}
          spotlightRadius={0.5}
          spotlightSoftness={1}
          spotlightOpacity={1}
          mouseDampening={0.15}
          distortAmount={0}
          shineDirection="left"
          mixBlendMode="lighten"
        />
        <div className="footer-main">
          <div className="footer-statement">
            <a className="footer-brand" href="#top" aria-label="Relay home">
              <Image
                src="/brand/relay/lockup-accent.svg"
                alt="Relay"
                width={160}
                height={50}
              />
            </a>
            <h2>Keep the next cut moving.</h2>
          </div>
          <div className="footer-action">
            <p>
              Projects, client notes, approvals, and delivery in one production
              workspace.
            </p>
            <SpecularButton href="/waitlist">
              Join the waitlist <ArrowRight size={17} />
            </SpecularButton>
            <nav className="footer-socials" aria-label="Social links">
              <a
                href="https://www.instagram.com/zns.studios/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://x.com/znsstudios"
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              <a href="mailto:zns.stuioss@gmail.com">Email</a>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Production workspace for video editors.</p>
          <nav aria-label="Footer navigation">
            <a href="#workflow">Workflow</a>
            <a href="#client-review">Review</a>
            <a href="#delivery">Delivery</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <p>© 2026 Relay</p>
        </div>
      </footer>
    </div>
  );
}

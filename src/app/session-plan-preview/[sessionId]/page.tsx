'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { SessionPlan, Session, Client, ActionPoint } from '@/types';
import SafeHtmlRenderer from '@/components/SafeHtmlRenderer';
import { cooperLtBT } from '@/app/fonts';
import { getSessionDogName } from '@/utils/dogNameUtils';

interface EditableActionPoint {
  header: string;
  details: string;
}

/* -----------------------------------------------------------------------
   NEW COMPONENT — DYNAMIC ACTION POINT PAGINATION
------------------------------------------------------------------------ */
interface DynamicActionPointPagesProps {
  title: string;
  editableActionPoints: EditableActionPoint[];
  isPlaywrightMode?: boolean;
  noFirstPage?: boolean;
  onPaginationComplete?: () => void;
}

function DynamicActionPointPages({ title, editableActionPoints, isPlaywrightMode = false, noFirstPage = true, onPaginationComplete }: DynamicActionPointPagesProps) {
  const [pages, setPages] = useState<EditableActionPoint[][]>([]);
  const [needsSeparateReminderPage, setNeedsSeparateReminderPage] = useState(false);

  useEffect(() => {
    if (!editableActionPoints || editableActionPoints.length === 0) return;

    // Approx A4 height in px (297mm * 3.78)
    const PAGE_HEIGHT = 297 * 3.78; // ~1122px
    const HEADER_HEIGHT = 113;
    const FOOTER_HEIGHT = 113;

    // Content budget: full page minus header and footer — action points fill right to the footer
    const CONTENT_MAX_MIDDLE = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
    const CONTENT_MAX_FINAL   = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

    const tempWrapper = document.createElement('div');
    tempWrapper.style.position = 'absolute';
    tempWrapper.style.visibility = 'hidden';
    tempWrapper.style.width = '210mm';
    tempWrapper.style.padding = '20px 2rem 0 2rem';
    tempWrapper.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(tempWrapper);

    // Measure the actual reminder height
    // Match the actual rendering: absolute positioning at bottom: '93px' (93px from page bottom for footer)
    const reminderBlock = document.createElement('div');
    // Use 14px for PDF mode, 15px for browser preview
    reminderBlock.style.fontFamily = 'Arial, sans-serif';
    reminderBlock.innerHTML = `
      <p style="margin: 0;">
        <strong>Reminder:</strong><br />
        I'm here to support you and your dog from a behavioural perspective.
        Sometimes, behavioural challenges can be linked to pain, diet, or
        physical discomfort, so I may highlight these areas if they seem
        relevant based on behavioural symptoms you've shared with me or that
        I've observed. Any thoughts I share within this report or any other
        communication with you around health, food, or physical wellbeing are
        intended to guide your conversations with your vet, physiotherapist,
        or nutritionist. I'm not a vet and don't offer medical advice or
        diagnosis.
      </p>
    `;
    tempWrapper.appendChild(reminderBlock);
    const reminderTextHeight = reminderBlock.offsetHeight;
    tempWrapper.innerHTML = '';

    // Reminder is `position:absolute; bottom:80px` inside page-content.
    // page-content height = PAGE_HEIGHT - HEADER_HEIGHT (footer is absolute, not in flow).
    // Available height for APs when reminder is present:
    //   page-content (1009px) - top padding (20px) - bottom gap (80px) - reminder text
    const REMINDER_BOTTOM_GAP = 80;
    const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT;
    const CONTENT_MAX_WITH_REMINDER = PAGE_CONTENT_HEIGHT - 20 - REMINDER_BOTTOM_GAP - reminderTextHeight;

    const builtPages: EditableActionPoint[][] = [];
    let currentPage: EditableActionPoint[] = [];
    let pageIndex = 0;

    // Helper function to create an action point element
    // Structure must match the rendered JSX exactly so measured heights are accurate.
    // The h3 is a sibling of block (not inside it) and is absolutely positioned,
    // so it does not contribute to the wrapper's offsetHeight — matching the render.
    const createActionPointElement = (ap: EditableActionPoint, isFirstOnPage: boolean, isLastOnPage: boolean, isVeryFirstOverall: boolean) => {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '0';
      wrapper.style.marginTop = isVeryFirstOverall ? '0' : '1.5rem';
      wrapper.style.position = 'relative';

      // h3 outside block, absolutely positioned — matches rendered layout
      const h3 = document.createElement('h3');
      h3.style.fontSize = '1.875rem';
      h3.style.fontStyle = 'italic';
      h3.style.position = 'absolute';
      h3.style.top = '-1rem';
      h3.style.left = '1.5rem';
      h3.style.padding = '0 0.5rem';
      h3.innerHTML = ap.header;
      wrapper.appendChild(h3);

      const block = document.createElement('div');
      block.style.border = '5px solid #4e6749';
      block.style.borderRadius = '0.5rem';
      block.style.padding = '1.5rem 1rem 1rem 1rem';

      block.innerHTML = `<div class="action-point-content">${ap.details}</div>`;

      const paragraphs = block.querySelectorAll('p');
      paragraphs.forEach((p, index) => {
        (p as HTMLElement).style.marginBottom = index === paragraphs.length - 1 ? '0' : '1rem';
      });

      wrapper.appendChild(block);
      return wrapper;
    };

    // Helper function to build and measure the current page
    const measureCurrentPage = () => {
      tempWrapper.innerHTML = '';

      let titleHeight = 0;
      // Add title on first page
      if (pageIndex === 0) {
        const titleBlock = document.createElement('h1');
        titleBlock.style.fontSize = '2.25rem';
        titleBlock.style.marginBottom = '1.5rem';
        titleBlock.style.fontWeight = 'bold';
        titleBlock.style.fontFamily = 'Arial, sans-serif';
        titleBlock.textContent = title;
        tempWrapper.appendChild(titleBlock);
        titleHeight = titleBlock.offsetHeight;
      }

      // Add all action points on current page
      currentPage.forEach((ap, index) => {
        const isFirstOnPage = index === 0;
        const isLastOnPage = index === currentPage.length - 1;
        // Very first action point overall is on pageIndex 0 and index 0
        const isVeryFirstOverall = pageIndex === 0 && index === 0;
        const element = createActionPointElement(ap, isFirstOnPage, isLastOnPage, isVeryFirstOverall);
        tempWrapper.appendChild(element);
      });

      const totalHeight = tempWrapper.offsetHeight;
      // Subtract the 20px top padding since it's included in offsetHeight but not in our content max calculations
      const contentHeight = totalHeight - 20;
      return contentHeight;
    };

    editableActionPoints.forEach((ap, apIndex) => {
      const isLastOverall = apIndex === editableActionPoints.length - 1;

      // Add action point to current page
      currentPage.push(ap);

      // Measure the current page with this action point
      const pageHeight = measureCurrentPage();

      // First, try with CONTENT_MAX_MIDDLE (assuming more items will follow)
      let contentMax = CONTENT_MAX_MIDDLE;
      let fits = pageHeight <= contentMax;

      // If it doesn't fit with middle footer, try with final footer
      // (in case this ends up being the last item on the page)
      if (!fits && !isLastOverall) {
        contentMax = CONTENT_MAX_FINAL;
        fits = pageHeight <= contentMax;
      }

      // If it's the last overall, reserve space for the reminder so it always
      // fits on the same page as the last action point
      if (isLastOverall) {
        contentMax = CONTENT_MAX_WITH_REMINDER;
        fits = pageHeight <= contentMax;
      }


      // Check if it fits
      if (!fits) {
        // Remove the action point that doesn't fit
        currentPage.pop();


        // Save the current page (if it has items)
        if (currentPage.length > 0) {
          builtPages.push(currentPage);
        }

        // Start a new page with this action point
        currentPage = [ap];
        pageIndex++;
      }
    });

    // Push last page
    if (currentPage.length > 0) builtPages.push(currentPage);

    // Check if there's enough space for the reminder on the last page
    // The Reminder now flows naturally after Action Points with marginTop: 2rem
    // So we need to check if Action Points + Reminder fit within CONTENT_MAX_FINAL
    const lastPageHeight = measureCurrentPage();
    const needsNewPage = lastPageHeight > CONTENT_MAX_WITH_REMINDER;
    setNeedsSeparateReminderPage(needsNewPage);

    document.body.removeChild(tempWrapper);
    setPages(builtPages);

    // Signal that pagination is complete
    if (onPaginationComplete) {
      onPaginationComplete();
    }
  }, [editableActionPoints, onPaginationComplete]);

  return (
    <>
      {pages.map((page, pageIndex) => {
        const isLastActionPointPage = pageIndex === pages.length - 1;
        const showReminderOnThisPage = isLastActionPointPage && !needsSeparateReminderPage;
        // Use final footer for last action point page (whether reminder is on it or on separate page after)
        // Use middle footer for all other action point pages
        const useFinalFooter = isLastActionPointPage;
        const footerImage = useFinalFooter
          ? "https://i.ibb.co/qZMcS8m/Copy-of-Raising-My-Rescue.png"
          : "https://i.ibb.co/Z6yY6r7M/Copy-of-Raising-My-Rescue-2.png";

        return (
          <div key={pageIndex} className="page">
            <img
              src="https://i.ibb.co/qYk7fyKf/Header-Banner.png"
              alt="Header"
              className="page-header"
            />

            <div className="page-content" style={{ position: 'relative' }}>
              {pageIndex === 0 && (
                <h1 style={{
                  fontSize: '2.25rem',
                  marginBottom: '1.5rem',
                  fontWeight: 'bold',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  {title}
                </h1>
              )}

              {page.map((ap, i) => {
                // Very first action point overall is on pageIndex 0 and i 0
                const isVeryFirstOverall = pageIndex === 0 && i === 0;
                return (
                  <div
                    key={i}
                    className="action-point"
                    style={{
                      marginBottom: '0',
                      marginTop: isVeryFirstOverall ? '0' : '1.5rem',
                      position: 'relative'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1.875rem',
                        fontStyle: 'italic',
                        position: 'absolute',
                        top: '-1rem',
                        left: '1.5rem',
                        background: '#eaeade',
                        padding: '0 0.5rem',
                        zIndex: 1
                      }}
                    >
                      <SafeHtmlRenderer html={ap.header} />
                    </h3>

                    <div
                      style={{
                        border: '5px solid #4e6749',
                        borderRadius: '0.5rem',
                        padding: '1.5rem 1rem 1rem 1rem',
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      <SafeHtmlRenderer html={ap.details} />
                    </div>
                  </div>
                );
              })}

              {/* REMINDER - show on last action point page if there's room */}
              {showReminderOnThisPage && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '2rem',
                    right: '2rem',
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  <p style={{ margin: 0, fontSize: isPlaywrightMode ? '15.5px' : '16px' }}>
                    <strong>Reminder:</strong><br />
                    I'm here to support you and your dog from a behavioural perspective.
                    Sometimes, behavioural challenges can be linked to pain, diet, or
                    physical discomfort, so I may highlight these areas if they seem
                    relevant based on behavioural symptoms you've shared with me or that
                    I've observed. Any thoughts I share within this report or any other
                    communication with you around health, food, or physical wellbeing are
                    intended to guide your conversations with your vet, physiotherapist,
                    or nutritionist. I'm not a vet and don't offer medical advice or
                    diagnosis.
                  </p>
                </div>
              )}
            </div>

            <img
              src={footerImage}
              alt="Footer"
              className="page-footer"
            />
          </div>
        );
      })}

      {/* SEPARATE REMINDER PAGE - if needed */}
      {needsSeparateReminderPage && (
        <div className="page">
          <img
            src="https://i.ibb.co/qYk7fyKf/Header-Banner.png"
            alt="Header"
            className="page-header"
          />

          <div className="page-content">
            <div
              style={{
                position: 'absolute',
                bottom: '80px',
                left: '2rem',
                right: '2rem',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <p style={{ margin: 0, fontSize: isPlaywrightMode ? '15.5px' : '16px' }}>
                <strong>Reminder:</strong><br />
                I'm here to support you and your dog from a behavioural perspective.
                Sometimes, behavioural challenges can be linked to pain, diet, or
                physical discomfort, so I may highlight these areas if they seem
                relevant based on behavioural symptoms you've shared with me or that
                I've observed. Any thoughts I share within this report or any other
                communication with you around health, food, or physical wellbeing are
                intended to guide your conversations with your vet, physiotherapist,
                or nutritionist. I'm not a vet and don't offer medical advice or
                diagnosis.
              </p>
            </div>
          </div>

          <img
            src="https://i.ibb.co/qZMcS8m/Copy-of-Raising-My-Rescue.png"
            alt="Footer"
            className="page-footer"
          />
        </div>
      )}
    </>
  );
}

/* -----------------------------------------------------------------------
   ORIGINAL PAGE COMPONENT — MERGED WITH DYNAMIC PAGINATION
------------------------------------------------------------------------ */

export default function SessionPlanPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const isPlaywrightMode = searchParams.get("playwright") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [editableActionPoints, setEditableActionPoints] = useState<EditableActionPoint[]>([]);
  const [mainGoals, setMainGoals] = useState<string[]>([]);
  const [explanationOfBehaviour, setExplanationOfBehaviour] = useState('');
  const [title, setTitle] = useState('');
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [dogClubGuideIds, setDogClubGuideIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [buttonText, setButtonText] = useState('Generate PDF & Send Email');
  const [paginationComplete, setPaginationComplete] = useState(false);

  useEffect(() => {
    if (!loading && paginationComplete) {
      document.body.setAttribute("data-paged-ready", "true");
    }
  }, [loading, paginationComplete]);

  const handleGeneratePDF = async () => {
    if (!sessionPlan || !session || !client) {
      alert("Missing required data. Please refresh the page and try again.");
      return;
    }

    setIsGenerating(true);
    setButtonText("Generating PDF...");

    try {
      const params = new URLSearchParams({
        sessionId: sessionPlan.sessionId,
        clientEmail: (client as any).email || '',
        clientFirstName: (client as any).first_name || '',
        clientLastName: (client as any).last_name || '',
        dogName: (session as any).dog_name || (client as any).dog_name || '',
        sessionNumber: sessionNumber.toString(),
        bookingDate: (session as any).booking_date || '',
        bookingTime: (session as any).booking_time || '',
        dogClubGuides: JSON.stringify(dogClubGuideIds),
      });

      const response = await fetch(`/api/generate-session-plan-pdf?${params}`);
      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to generate PDF';
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : '';
        throw new Error(errorMsg + errorDetails);
      }

      setButtonText("✓ Email Draft Created!");

      setTimeout(() => {
        setButtonText("Generate PDF & Send Email");
        setIsGenerating(false);
      }, 3000);

    } catch (error: any) {
      alert(`Failed to generate PDF: ${error.message}`);
      setButtonText("Generate PDF & Send Email");
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/session-plan-preview/${sessionId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        const plan = json.sessionPlan;
        const sess = json.session;
        const cli = json.client;
        const apList = json.actionPoints;

        const planObj: SessionPlan = {
          id: plan.id,
          sessionId: plan.session_id,
          sessionNumber: plan.session_number,
          mainGoal1: plan.main_goal_1,
          mainGoal2: plan.main_goal_2,
          mainGoal3: plan.main_goal_3,
          mainGoal4: plan.main_goal_4,
          explanationOfBehaviour: plan.explanation_of_behaviour,
          actionPoints: plan.action_points || [],
          editedActionPoints: plan.edited_action_points || {},
          documentEditUrl: plan.document_edit_url,
          noFirstPage: plan.no_first_page ?? true,
          createdAt: new Date(plan.created_at),
          updatedAt: new Date(plan.updated_at),
        };

        setSessionPlan(planObj);
        setSession(sess);
        setClient(cli);
        setDogClubGuideIds(plan.dog_club_guides || []);

        setMainGoals([
          plan.main_goal_1,
          plan.main_goal_2,
          plan.main_goal_3,
          plan.main_goal_4,
        ].filter(Boolean));

        setExplanationOfBehaviour(plan.explanation_of_behaviour || '');

        const aps = [];
        for (const id of plan.action_points || []) {
          // Check if this is a custom/blank action point (starts with 'blank-')
          if (id.startsWith('blank-')) {
            // For custom action points, use only the edited content
            const edited = plan.edited_action_points?.[id];
            if (edited) {
              aps.push({
                header: edited.header || '',
                details: edited.details || '',
              });
            }
          } else {
            // For predefined action points, look up in apList
            const ap = apList.find((x: any) => x.id === id);
            if (!ap) continue;
            const edited = plan.edited_action_points?.[id];
            aps.push({
              header: edited?.header || ap.header,
              details: edited?.details || ap.details,
            });
          }
        }
        setEditableActionPoints(aps);

        const dogName = getSessionDogName(sess.dog_name, cli);
        // Use server-calculated session number (avoids RLS issues in unauthenticated Puppeteer context)
        const recalculated = json.calculatedSessionNumber || 1;
        setSessionNumber(recalculated);
        setTitle(`Session ${recalculated} - ${dogName}`);

        setLoading(false);
      } catch (err) {
        setError("Failed to load data");
        setLoading(false);
      }
    }

    if (sessionId) load();
  }, [sessionId]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen bg-white flex items-center justify-center">Error: {error}</div>;

  return (
    <>
      <style>{`
        body, html {
          -webkit-font-smoothing: antialiased;
        }

        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          button { display: none !important; }
        }

        .pdf-viewer {
          background: #525659;
          min-height: 100vh;
          padding: 2rem 0;
        }

        .page {
          width: 210mm;
          height: 297mm;
          background: #eaeade;
          position: relative;
          page-break-after: always;
          margin: 0 auto 2rem auto;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .page:last-child {
          page-break-after: auto;
        }

        .page-header {
          width: 100%;
          height: auto;
          display: block;
        }

        .page-footer {
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
        }

        .page-content {
          padding: 20px 2rem 0 2rem;
          flex: 1;
          position: relative;
        }

        .action-point {
          page-break-inside: avoid;
          break-inside: avoid;
          font-size: ${isPlaywrightMode ? '15.5px' : '16px'};
        }

        @media print {
          .pdf-viewer {
            background: #eaeade;
            padding: 0;
          }
          .page {
            margin: 0;
            box-shadow: none;
            page-break-inside: avoid;
            page-break-after: always;
            height: 297mm;
            overflow: hidden;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .action-point {
            page-break-inside: avoid;
            break-inside: avoid;
            font-size: ${isPlaywrightMode ? '15.5px' : '16px'};
          }
        }
      `}</style>

      <div className={`pdf-viewer ${cooperLtBT.className}`}>

        {!isPlaywrightMode && (
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              backgroundColor: buttonText.includes('✓') ? '#059669' : '#973b00',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              border: 'none',
              cursor: isGenerating ? 'wait' : 'pointer',
              zIndex: 999999,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {buttonText}
          </button>
        )}

        {/* PAGE 1 - Only render if noFirstPage is false */}
        {!sessionPlan?.noFirstPage && (
          <div className="page">
            <img
              src="https://i.ibb.co/qYk7fyKf/Header-Banner.png"
              alt="Header"
              className="page-header"
            />

            <div className="page-content">
              <h1 style={{
                fontSize: '2.25rem',
                marginBottom: '1.5rem',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
              }}>
                {title}
              </h1>

              {mainGoals.length > 0 && (
                <div style={{ marginBottom: '2rem', position: 'relative' }}>
                  <h3
                    style={{
                      fontSize: '1.875rem',
                      fontStyle: 'italic',
                      position: 'absolute',
                      top: '-1rem',
                      left: '1.5rem',
                      background: '#eaeade',
                      padding: '0 0.5rem',
                      zIndex: 1
                    }}
                  >
                    Main Goals
                  </h3>

                  <div style={{
                    border: '5px solid #4e6749',
                    borderRadius: '0.5rem',
                    padding: '1.5rem 1rem 1rem',
                    display: 'grid',
                    fontSize: isPlaywrightMode ? '15.5px' : '16px',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem 2rem'
                  }}>
                    {mainGoals.map((g, i) => (
                      <p key={i} style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
                        <SafeHtmlRenderer html={g} />
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {explanationOfBehaviour && (
                <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
                  <h3
                    style={{
                      fontSize: '1.875rem',
                      fontStyle: 'italic',
                      marginBottom: '0.75rem'
                    }}
                  >
                    Explanation of Behaviour
                  </h3>

                  <div style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: isPlaywrightMode ? '15.5px' : '16px',
                    display: 'flex'
                  }}>
                    <div style={{ flex: 1 }}>
                      <SafeHtmlRenderer html={explanationOfBehaviour} />
                    </div>
                    <img
                      src="https://i.ibb.co/k6Dcmnws/Paws.png"
                      alt="Paws"
                      style={{
                        width: 'auto',
                        height: '500px',
                        marginRight: '-25px',
                        marginTop: '-50px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <img
              src="https://i.ibb.co/S7Kb8xjh/Copy-of-Raising-My-Rescue-1.png"
              alt="Footer Page 1"
              className="page-footer"
            />
          </div>
        )}

        {/* DYNAMIC ACTION POINT PAGES */}
        <DynamicActionPointPages
          title={title}
          editableActionPoints={editableActionPoints}
          isPlaywrightMode={isPlaywrightMode}
          noFirstPage={sessionPlan?.noFirstPage ?? true}
          onPaginationComplete={() => setPaginationComplete(true)}
        />

      </div>
    </>
  );
}
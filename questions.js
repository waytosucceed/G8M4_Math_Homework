var questions = [];
var i = 0;
var count = 0;
var score = 0;
var Ansgiven = []; // Store answers given by the user
var previousQuestionIndex = null; // Track the previously displayed question
var topicName = ""; // Variable to store the topic name
const submitSound = document.getElementById("submit-sound");

const uniqueKey = "G8M4Math_Homework";

// ============================================================
// FRACTION HELPER FUNCTIONS (from File 2)
// ============================================================

// Converts fraction answers into sorted rational strings for unordered comparison
function buildRationalSet(answers, question) {
  var rationals = [];
  var index = 0;

  question.question.forEach(function (part) {
    if (part.fraction) {
      var whole =
        part.fraction.whole === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.whole || 0);

      var num =
        part.fraction.numerator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.numerator);

      var den =
        part.fraction.denominator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.denominator);

      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        var improper = whole * den + num;
        var g = gcd(improper, den);
        rationals.push(improper / g + "/" + den / g);
      }
    }
  });

  return rationals.sort();
}

// Greatest common divisor helper
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Converts flat answer array into human-readable fraction HTML strings for review display
function buildDisplayString(answers, question) {
  if (!answers || !Array.isArray(answers)) return String(answers || "");

  var slots = [];

  var questionParts = Array.isArray(question.question)
    ? question.question
    : [question.question];

  questionParts.forEach(function (part) {
    if (typeof part === "string") {
      var matches = part.match(
        /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g,
      );
      if (matches) {
        matches.forEach(function () {
          slots.push({ type: "whole" });
        });
      }
    } else if (part.root) {
      // root with blank value counts as one input slot
      if (part.root.value === "______") {
        slots.push({ type: "whole" });
      }
      // fixed root values (e.g. ∛150) contribute no input slot
    } else if (part.fraction) {
      var numIsArray = Array.isArray(part.fraction.numerator);
      var wholeBlank = part.fraction.whole === "______";
      var numBlank = part.fraction.numerator === "______";
      var denBlank = part.fraction.denominator === "______";

      // Skip fully fixed fractions — nothing to display from answers
      if (!wholeBlank && !numBlank && !numIsArray && !denBlank) return;

      slots.push({
        type: "mixedFraction",
        wholeBlank,
        numIsArray,
        numArray: numIsArray ? part.fraction.numerator : null,
        numBlank,
        denBlank,
        whole: part.fraction.whole,
        num: part.fraction.numerator,
        den: part.fraction.denominator,
      });
    }
  });

  var parts = [];
  var answerIndex = 0;

  if (slots.length === 0) {
    return answers
      .map((a) => `<span>${a !== undefined && a !== null ? a : "?"}</span>`)
      .join(" , ");
  }

  slots.forEach(function (slot) {
    if (slot.type === "mixedFraction") {
      var whole = slot.wholeBlank ? answers[answerIndex++] : slot.whole;

      var numDisplay = "";
      if (slot.numIsArray) {
        // Build "18 + 8" or "18 − 8" from array
        numDisplay = slot.numArray
          .map((item) => {
            if (item === "______") return answers[answerIndex++] || "?";
            return item;
          })
          .join(" ");
      } else if (slot.numBlank) {
        numDisplay = answers[answerIndex++];
      } else {
        numDisplay = slot.num;
      }

      var den = slot.denBlank ? answers[answerIndex++] : slot.den;

      parts.push(`
        <span class="display-fraction">
          ${whole ? `<span class="whole-part">${whole}</span>` : ""}
          <span class="fraction-part">
            <span class="numerator">${numDisplay}</span>
            <span class="denominator">${den}</span>
          </span>
        </span>
      `);
    } else {
      parts.push(
        `<span>${answers[answerIndex] !== undefined && answers[answerIndex] !== null ? answers[answerIndex] : "?"}</span>`,
      );
      answerIndex++;
    }
  });

  return parts.join(" , ");
}

// Formats textParts array (mixed text + fraction objects) into HTML string
function formatTextPartsForDisplay(textParts) {
  return textParts
    .map(function (part) {
      if (typeof part === "string") {
        return part;
      } else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;
        return `
        <span class="display-fraction">
          <span class="fraction-part">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        </span>
      `;
      }
      return "";
    })
    .join("");
}

// ============================================================
// ROOT RENDERER (√ symbol with overline)
// ============================================================

function renderRoot(rootObj, overrideColor) {
  const { index, value } = rootObj;
  const rootColor = overrideColor || "#1a2a4a";
  const textColor = overrideColor || "#222";

  const indexHTML =
    index && index !== 2
      ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${index}</span>`
      : "";

  // If value is a blank — render an input box inside the radical
  const innerContent =
    value === "______"
      ? `<input type="text" class="answer-input" autocomplete="off"
           style="width:45px;height:32px;border:2px solid #007bff;border-radius:4px;
                  font-size:0.9em;font-weight:bold;text-align:center;background:white;
                  outline:none;padding:0;margin:0 2px;" />`
      : `<span style="font-size:1em;font-weight:bold;padding:0 3px;color:${textColor};">${value}</span>`;

  return `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;color:${textColor};">
    <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
      ${indexHTML}
      <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
      <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:9px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
        ${innerContent}
      </span>
    </span>
  </span>`;
}

// ============================================================
// ADDITION GRID BUILDER
// ============================================================

function buildAdditionGridHTML(question, resultValues, mode) {
  const layout = question.layout;
  const cols = Math.max(
    (layout.carry || []).length,
    (layout.top || []).length,
    (layout.bottom || []).length,
    (layout.result || []).length,
  );

  const normalize = (arr = []) => {
    const copy = [...arr];
    while (copy.length < cols) copy.unshift(null);
    return copy;
  };

  const carry = normalize(layout.carry || new Array(cols).fill(null));
  const place = layout.place ? normalize(layout.place) : null;
  const top = normalize(layout.top);
  const bottom = normalize(layout.bottom);
  const result = normalize(layout.result);

  const colColors = [
    "#e53935",
    "#7b1fa2",
    "#212121",
    "#e65100",
    "#1565c0",
    "#2e7d32",
  ];
  const getColor = (idx) => colColors[idx % colColors.length];

  let resultIdx = 0;

  const gridStyle = `
    display:grid;
    grid-template-columns: 36px repeat(${cols}, 52px);
    gap:4px 2px;
    align-items:center;
    justify-items:center;
    font-size:1.4rem;
    font-weight:bold;
    padding:16px;
    background:#fff;
    border-radius:10px;
    border:1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;

  const cellStyle = (extra = "") =>
    `display:flex;align-items:center;justify-content:center;
     min-width:44px;min-height:44px;${extra}`;

  let html = `<div style="${gridStyle}">`;

  /* ===== Carry Row ===== */
  html += `<div></div>`;
  carry.forEach((val) => {
    if (val === "_") {
      html += `<div style="${cellStyle("font-size:0.9rem;color:#888;align-items:flex-end;padding-bottom:2px;")}">
                 <span style="border:1px solid #ccc;border-radius:4px;
                              padding:2px 8px;min-width:28px;text-align:center;
                              background:#f9f9f9;">&nbsp;</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle("font-size:0.9rem;color:#888;align-items:flex-end;padding-bottom:2px;")}">${val ?? ""}</div>`;
    }
  });

  /* ===== Place Row ===== */
  if (place) {
    html += `<div></div>`;
    place.forEach((val, ci) => {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1rem;font-weight:700;`)}">${val ?? ""}</div>`;
    });
  }

  /* ===== Top Row ===== */
  html += `<div></div>`;
  top.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  /* ===== Bottom Row ===== */
  html += `<div style="${cellStyle("justify-content:flex-end;padding-right:4px;font-size:1.6rem;")}">${layout.sign || "+"}</div>`;
  bottom.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  /* ===== Line ===== */
  html += `<div style="grid-column:1/span ${cols + 1};height:3px;
                        background:#333;width:100%;margin:2px 0;"></div>`;

  /* ===== Result Row ===== */
  html += `<div></div>`;
  result.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  html += `</div>`;
  return html;
}

function buildLongDivisionSqReviewHTML(question, studentValues, mode) {
  const correctAnswers = question.answer || [];
  let inputIndex = 0;

  const norm = (v) =>
    String(v || "")
      .replace(/,/g, "")
      .toLowerCase()
      .trim();

  // Replace _____ with a colored answer span
  function makeAnswerSpan(rawHtml) {
    return rawHtml.replace(/_{3,}/g, () => {
      const filled = norm(studentValues[inputIndex] || "");
      const correct = norm(correctAnswers[inputIndex] || "");
      const isRight = filled === correct;
      const display =
        mode === "correct"
          ? correctAnswers[inputIndex] || "?"
          : studentValues[inputIndex] || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const col =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<span style="display:inline-flex;align-items:center;justify-content:center;
        min-width:18px;height:18px;background:${bg};color:${col};
        border-radius:3px;font-weight:bold;font-size:0.85em;padding:0 2px;margin:1px;">${display}</span>`;
    });
  }

  const gridStyle =
    "display:grid;grid-template-columns:minmax(20px,auto) 2px minmax(70px,auto) 2px minmax(20px,auto);" +
    "row-gap:0px;align-items:stretch;font-size:0.72em;font-weight:bold;" +
    "margin:4px auto;width:max-content;text-align:center;";

  let html = `<div style="${gridStyle}">`;

  question.longDivisionSq.forEach((row) => {
    const leftContent = makeAnswerSpan(row.left || "");
    const rightContent = makeAnswerSpan(row.right || "");
    const insideContent = makeAnswerSpan(row.inside || "");

    html += `<div style="display:flex;align-items:center;justify-content:flex-end;padding-right:4px;">${leftContent}</div>`;
    html += `<div style="${row.leftBracket ? "border-left:2px solid #000;" : ""}"></div>`;

    let mainStyles =
      "padding:2px 0px;text-align:left;position:relative;min-height:26px;display:flex;align-items:center;";
    if (row.topBar) mainStyles += "border-top:2px solid #000;";
    if (row.bottomLine) mainStyles += "border-bottom:2px solid #000;";
    html += `<div style="${mainStyles}"><div style="width:100%;white-space:nowrap;">${insideContent}</div></div>`;

    html += `<div style="${row.rightBracket ? "border-right:2px solid #000;" : ""}"></div>`;
    html += `<div style="display:flex;align-items:center;padding-left:4px;">${rightContent}</div>`;
  });

  html += `</div>`;

  // questionAfter
  if (question.questionAfter) {
    html += `<div style="margin-top:4px;display:flex;align-items:center;gap:2px;flex-wrap:wrap;justify-content:center;font-size:0.72em;font-weight:bold;">`;
    const parts = Array.isArray(question.questionAfter)
      ? question.questionAfter
      : [question.questionAfter];
    parts.forEach((p) => {
      if (typeof p === "string") {
        const pieces = p.split("______");
        pieces.forEach((piece, pi) => {
          if (piece) html += `<span>${piece}</span>`;
          if (pi < pieces.length - 1) {
            const filled = norm(studentValues[inputIndex] || "");
            const correct = norm(correctAnswers[inputIndex] || "");
            const isRight = filled === correct;
            const display =
              mode === "correct"
                ? correctAnswers[inputIndex] || "?"
                : studentValues[inputIndex] || "?";
            const bg =
              mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
            const col =
              mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
            inputIndex++;
            html += `<span style="display:inline-flex;align-items:center;justify-content:center;
              min-width:22px;height:20px;background:${bg};color:${col};
              border-radius:3px;font-weight:bold;font-size:0.85em;padding:0 3px;">${display}</span>`;
          }
        });
      } else if (p.root) {
        html += renderRoot(p.root);
      }
    });
    html += `</div>`;
  }

  return html;
}

function buildTableHTML(question, studentValues, mode) {
  const structure = question.tableStructure;
  const correctAnswers = question.answer || [];

  const totalCols = Math.max(...structure.map((r) => r.length));

  let answerIdx = 0;

  const tableStyle = `
    border-collapse: collapse;
    border: 2px solid black;
    font-size: 0.85em;
    width: auto;
    max-width: 100%;
  `;

  const wrapStyle = `
    display: block;
    background: #fff;
    border-radius: 8px;
    padding: 6px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    max-width: 100%;
  `;

  // Helper: render a fraction object as inline HTML
  function renderFractionCell(frac) {
    const { numerator, denominator } = frac;
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.1;vertical-align:middle;">
      <span style="border-bottom:1.5px solid currentColor;padding:0 3px;font-size:0.95em;">${numerator}</span>
      <span style="padding:0 3px;font-size:0.95em;">${denominator}</span>
    </span>`;
  }

  let html = `<div style="${wrapStyle}"><table style="${tableStyle}">`;

  structure.forEach((row, rowIndex) => {
    html += `<tr>`;

    if (row.length === 1) {
      html += `<td colspan="${totalCols}"
        style="border:1px solid black;padding:4px 8px;
               text-align:center;font-weight:bold;
               background:#f0f0f0;">
        ${row[0]}
      </td>`;
      html += `</tr>`;
      return;
    }

    row.forEach((cell, cellIndex) => {
      const isHeader = rowIndex === 0 || cellIndex === 0;

      if (cell === "INPUT") {
        const filled = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correct = (correctAnswers[answerIdx] || "").trim().toLowerCase();
        const isRight = filled === correct;
        const display =
          mode === "correct"
            ? correctAnswers[answerIdx] || ""
            : studentValues[answerIdx] || "";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx++;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="
                     display:inline-flex;
                     align-items:center;
                     justify-content:center;
                     min-width:40px;
                     height:28px;
                     background:${bgColor};
                     color:${txtColor};
                     border-radius:5px;
                     font-weight:bold;
                     font-size:0.9em;
                   ">${display || "?"}</span>
                 </td>`;
      } else if (cell === "PERCENT_INPUT") {
        const filled = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correct = (correctAnswers[answerIdx] || "").trim().toLowerCase();
        const isRight = filled === correct;
        const display =
          mode === "correct"
            ? correctAnswers[answerIdx] || ""
            : studentValues[answerIdx] || "";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx++;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="display:inline-flex;align-items:center;gap:2px;justify-content:center;">
                     <span style="
                       display:inline-flex;align-items:center;justify-content:center;
                       min-width:36px;height:28px;background:${bgColor};color:${txtColor};
                       border-radius:5px;font-weight:bold;font-size:0.9em;
                     ">${display || "?"}</span>
                     <span style="font-weight:bold;font-size:0.9em;">%</span>
                   </span>
                 </td>`;
      } else if (cell === "FRACTION_INPUT") {
        // Two consecutive answers: numerator then denominator
        const filledNum = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correctNum = (correctAnswers[answerIdx] || "")
          .trim()
          .toLowerCase();
        const filledDen = (studentValues[answerIdx + 1] || "")
          .trim()
          .toLowerCase();
        const correctDen = (correctAnswers[answerIdx + 1] || "")
          .trim()
          .toLowerCase();
        const isRight = filledNum === correctNum && filledDen === correctDen;

        const numDisplay =
          mode === "correct"
            ? correctAnswers[answerIdx] || "?"
            : studentValues[answerIdx] || "?";
        const denDisplay =
          mode === "correct"
            ? correctAnswers[answerIdx + 1] || "?"
            : studentValues[answerIdx + 1] || "?";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx += 2;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="display:inline-flex;flex-direction:column;align-items:center;
                                background:${bgColor};color:${txtColor};border-radius:5px;
                                padding:3px 6px;font-weight:bold;font-size:0.9em;line-height:1.3;">
                     <span style="border-bottom:1.5px solid ${txtColor};padding:0 3px;">${numDisplay}</span>
                     <span style="padding:0 3px;">${denDisplay}</span>
                   </span>
                 </td>`;
      } else if (cell && typeof cell === "object" && cell.fraction) {
        // Fraction object cell (given value, not input)
        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:45px;
                             ${isHeader ? "background:#f0f0f0;font-weight:bold;" : ""}">
                   ${renderFractionCell(cell.fraction)}
                 </td>`;
      } else if (cell === "" && rowIndex > 0 && cellIndex > 0) {
        html += `<td style="border:1px solid black;padding:4px 6px;
                             text-align:center;background:#81D486;
                             min-width:45px;">&nbsp;</td>`;
      } else {
        html += `<td style="border:1px solid black;padding:4px 6px;
                             text-align:center;min-width:45px;
                             ${isHeader ? "background:#f0f0f0;font-weight:bold;" : ""}">
                   ${cell}
                 </td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</table></div>`;
  return html;
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

function saveToLocalStorage(key, value) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  storageData[key] = value;
  localStorage.setItem(uniqueKey, JSON.stringify(storageData));
}

function getFromLocalStorage(key) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  return storageData[key];
}

// ============================================================
// FETCH & INIT
// ============================================================

fetch("questions.json")
  .then((response) => response.json())
  .then((data) => {
    const urlParams = new URLSearchParams(window.location.search);
    topicName = urlParams.get("topic");

    const selectedTopic = data.topics.find((t) => t.heading === topicName);

    if (selectedTopic) {
      questions = selectedTopic.questions;
      count = questions.length;

      // Load previously saved answers from localStorage
      // Commented out to prevent previous topic answers from auto-selecting
      // const savedAnswers = getFromLocalStorage('Ansgiven')
      // if (savedAnswers && Array.isArray(savedAnswers) && savedAnswers.length === count) {
      //   Ansgiven = savedAnswers
      // } else {
      Ansgiven = new Array(count).fill(null);
      // }

      saveToLocalStorage(topicName + "_totalQuestions", count);

      const headingElement = document.getElementById("heading");
      if (headingElement) {
        headingElement.innerText = topicName || "PS";
      }

      // Load saved question index
      const savedIndex = getFromLocalStorage("currentQuestionIndex");
      if (
        savedIndex !== undefined &&
        savedIndex !== null &&
        savedIndex < count
      ) {
        i = savedIndex;
      }

      loadButtons();
      loadQuestion(i);

      // FIXED: Store ALL topics from the JSON file
      saveToLocalStorage("topics", data.topics);
      saveToLocalStorage(topicName + "_topicData", selectedTopic);
    } else {
      const headingElement = document.getElementById("heading");
      const buttonContainer = document.getElementById("buttonContainer");
      if (headingElement) headingElement.innerText = "Topic not found";
      if (buttonContainer)
        buttonContainer.innerHTML = "No questions available for this topic.";
    }
  });

// ============================================================
// LOAD BUTTONS
// ============================================================

function loadButtons() {
  var buttonContainer = document.getElementById("buttonContainer");
  if (!buttonContainer) {
    console.error("buttonContainer element not found");
    return;
  }

  buttonContainer.innerHTML = "";
  for (var j = 0; j < questions.length; j++) {
    var btn = document.createElement("button");
    btn.className = "btnButton btn smallbtn";
    btn.type = "button";  
    btn.innerHTML = "Q" + (j + 1);
    btn.setAttribute("onclick", "abc(" + (j + 1) + ")");

    if (getFromLocalStorage(topicName + "_completed")) {
      btn.classList.add("disabled-btn");
      btn.disabled = true;
    }

    buttonContainer.appendChild(btn);
  }
  updateButtonStyles();
}

// ============================================================
// DROPDOWN HELPER
// ============================================================

function createDropdown(optionsArray) {
  const select = document.createElement("select");
  select.className = "answer-input dropdown-input";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "";
  select.appendChild(defaultOption);

  optionsArray.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    handleInputAnswerChange();
  });

  return select;
}

// ============================================================
// RENDER QUESTION TEXT (fractions + HTML)
// ============================================================

function renderQuestionText(questionParts, questionElement) {
  if (!questionElement) {
    console.error("questionElement is null");
    return;
  }

  questionElement.innerHTML = "";

  questionParts.forEach((part) => {
    if (typeof part === "string") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = part;

      if (part.includes("<") && part.includes(">")) {
        while (tempDiv.firstChild) {
          questionElement.appendChild(tempDiv.firstChild);
        }
      } else {
        questionElement.appendChild(document.createTextNode(part));
      }
    } else if (part.fraction) {
      const { whole, numerator, denominator } = part.fraction;

      const span = document.createElement("span");
      span.className = "mixed-fraction";

      if (whole !== undefined && whole !== "") {
        span.innerHTML = `
          <span class="whole">${whole}</span>
          <span class="fraction">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        `;
      } else {
        span.innerHTML = `
          <span class="whole">&nbsp;</span>
          <span class="fraction">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        `;
      }
      questionElement.appendChild(span);
    } else if (part.root) {
      const span = document.createElement("span");
      if (part.root.value === "______") {
        // Has an input inside — use innerHTML so the input is created, then wire up event
        span.innerHTML = renderRoot(part.root);
        // Wire up the input inside
        const inp = span.querySelector("input");
        if (inp) inp.addEventListener("input", handleInputAnswerChange);
      } else {
        span.innerHTML = renderRoot(part.root);
      }
      questionElement.appendChild(span);
    }
  });
}

// ============================================================
// TABLE QUESTION LOADER
// ============================================================

function loadTableQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.style.gap = "15px";
  optionsElement.classList.add("table-question");

  var mainContainer = document.createElement("div");
  mainContainer.style.display = "flex";
  mainContainer.style.flexDirection = "column";
  mainContainer.style.width = "100%";
  mainContainer.style.alignItems = "center";
  mainContainer.style.gap = "15px";

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.width = "100%";
  questionContainer.style.display = "flex";
  questionContainer.style.flexWrap = "wrap";
  questionContainer.style.justifyContent = "center";
  questionContainer.style.alignItems = "center";
  questionContainer.style.gap = "5px";
  questionContainer.style.fontSize = "1.5em";
  questionContainer.style.textAlign = "center";
  questionContainer.style.padding = "0";

  if (randomQuestion.question) {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionContainer);
    } else {
      questionContainer.innerHTML = randomQuestion.question;
    }
  }

  var tableContainer = document.createElement("div");
  tableContainer.className = "table-container";
  tableContainer.style.width = "50%";
  tableContainer.style.display = "flex";
  tableContainer.style.justifyContent = "center";
  tableContainer.style.alignItems = "center";

  var table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.border = "2px solid black";
  table.style.fontSize = "1.1em";
  table.style.width = "100%";
  table.style.maxWidth = "90%";

  let inputIndex = 0;

  randomQuestion.tableStructure.forEach((row, rowIndex) => {
    var tr = document.createElement("tr");

    const totalCols = randomQuestion.tableStructure[1]
      ? randomQuestion.tableStructure[1].length
      : row.length;

    if (row.length === 1) {
      var td = document.createElement("td");
      td.setAttribute("colspan", totalCols);
      td.style.border = "2px solid black";
      td.style.padding = "2%";
      td.style.textAlign = "center";
      td.style.fontWeight = "bold";
      td.style.backgroundColor = "#f0f0f0";
      td.innerHTML = row[0];
      tr.appendChild(td);
      table.appendChild(tr);
      return;
    }

    row.forEach((cell, cellIndex) => {
      var td = document.createElement("td");
      td.style.border = "2px solid black";
      td.style.padding = "2%";
      td.style.textAlign = "center";
      td.style.minWidth = "60px";
      td.style.minHeight = "45px";

      if (rowIndex === 0 || cellIndex === 0) {
        td.style.backgroundColor = "#f0f0f0";
        td.style.fontWeight = "bold";
      }

      if (cell === "INPUT") {
        var input = document.createElement("input");
        input.type = "text";
        input.className = "answer-input table-input";
        input.style.width = "55px";
        input.style.height = "35px";
        input.style.textAlign = "center";
        input.style.border = "1px solid #007bff";
        input.style.borderRadius = "6px";
        input.style.fontSize = "1.1em";
        input.style.backgroundColor = "white";

        input.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        td.appendChild(input);
        inputIndex++;
      } else if (cell === "PERCENT_INPUT") {
        // Input box with a fixed % label — student types only the number
        var pctWrap = document.createElement("span");
        pctWrap.style.display = "inline-flex";
        pctWrap.style.alignItems = "center";
        pctWrap.style.gap = "3px";

        var pctInput = document.createElement("input");
        pctInput.type = "text";
        pctInput.className = "answer-input table-input";
        pctInput.style.width = "45px";
        pctInput.style.height = "35px";
        pctInput.style.textAlign = "center";
        pctInput.style.border = "1px solid #007bff";
        pctInput.style.borderRadius = "6px";
        pctInput.style.fontSize = "1.1em";
        pctInput.style.backgroundColor = "white";
        pctInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var pctLabel = document.createElement("span");
        pctLabel.textContent = "%";
        pctLabel.style.fontWeight = "bold";
        pctLabel.style.fontSize = "1.1em";

        pctWrap.appendChild(pctInput);
        pctWrap.appendChild(pctLabel);
        td.appendChild(pctWrap);
        inputIndex++;
      } else if (cell === "FRACTION_INPUT") {
        // Render two input boxes stacked with a fraction line — numerator input / denominator input
        var fracWrap = document.createElement("span");
        fracWrap.className = "mixed-fraction";
        fracWrap.style.justifyContent = "center";

        var fracInner = document.createElement("span");
        fracInner.className = "fraction";

        var numInput = document.createElement("input");
        numInput.type = "text";
        numInput.className = "answer-input table-input fraction-num-input";
        numInput.style.width = "45px";
        numInput.style.height = "30px";
        numInput.style.textAlign = "center";
        numInput.style.border = "1px solid #007bff";
        numInput.style.borderRadius = "4px";
        numInput.style.fontSize = "1em";
        numInput.style.backgroundColor = "white";
        numInput.style.display = "block";
        numInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var numSpan = document.createElement("span");
        numSpan.className = "numerator";
        numSpan.style.borderBottom = "2px solid #000";
        numSpan.style.padding = "0 2px";
        numSpan.appendChild(numInput);

        var denInput = document.createElement("input");
        denInput.type = "text";
        denInput.className = "answer-input table-input fraction-den-input";
        denInput.style.width = "45px";
        denInput.style.height = "30px";
        denInput.style.textAlign = "center";
        denInput.style.border = "1px solid #007bff";
        denInput.style.borderRadius = "4px";
        denInput.style.fontSize = "1em";
        denInput.style.backgroundColor = "white";
        denInput.style.display = "block";
        denInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var denSpan = document.createElement("span");
        denSpan.className = "denominator";
        denSpan.style.padding = "0 2px";
        denSpan.appendChild(denInput);

        fracInner.appendChild(numSpan);
        fracInner.appendChild(denSpan);
        fracWrap.appendChild(fracInner);
        td.appendChild(fracWrap);
        inputIndex += 2;
      } else if (cell && typeof cell === "object" && cell.fraction) {
        // Render fraction object as stacked fraction display
        var fracSpan = document.createElement("span");
        fracSpan.style.display = "inline-flex";
        fracSpan.style.flexDirection = "column";
        fracSpan.style.alignItems = "center";
        fracSpan.style.lineHeight = "1.1";
        fracSpan.style.verticalAlign = "middle";
        fracSpan.innerHTML =
          '<span style="border-bottom:1.5px solid currentColor;padding:0 3px;font-size:0.95em;">' +
          cell.fraction.numerator +
          '</span><span style="padding:0 3px;font-size:0.95em;">' +
          cell.fraction.denominator +
          "</span>";
        td.appendChild(fracSpan);
      } else if (cell === "" && rowIndex > 0 && cellIndex > 0) {
        td.style.backgroundColor = "#81D486";
        td.innerHTML = "&nbsp;";
      } else {
        td.innerHTML = cell;
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  tableContainer.appendChild(table);
  mainContainer.appendChild(questionContainer);
  mainContainer.appendChild(tableContainer);
  optionsElement.appendChild(mainContainer);

  var previouslyEntered = Ansgiven[index];
  if (previouslyEntered && Array.isArray(previouslyEntered)) {
    let inputs = tableContainer.querySelectorAll(".table-input");
    inputs.forEach((input, idx) => {
      if (
        previouslyEntered[idx] !== undefined &&
        previouslyEntered[idx] !== ""
      ) {
        input.value = previouslyEntered[idx];
      }
    });
  }
}

// ============================================================
// ADDITION QUESTION RENDERER
// ============================================================

function renderAdditionQuestion(question, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.justifyContent = "center";
  optionsElement.style.alignItems = "center";
  optionsElement.style.gridTemplateColumns = "";

  const cols = Math.max(
    (question.layout.carry || []).length,
    question.layout.top.length,
    question.layout.bottom.length,
    question.layout.result.length,
  );

  const grid = document.createElement("div");
  grid.className = "addition-grid";
  grid.style.setProperty("--cols", cols);

  let inputIndex = 0;

  const normalize = (arr = []) => {
    const copy = [...arr];
    while (copy.length < cols) copy.unshift(null);
    return copy;
  };

  const carry = normalize(question.layout.carry || new Array(cols).fill(null));
  const place = question.layout.place ? normalize(question.layout.place) : null;
  const top = normalize(question.layout.top);
  const bottom = normalize(question.layout.bottom);
  const result = normalize(question.layout.result);

  const colColors = [
    "#e53935",
    "#7b1fa2",
    "#212121",
    "#e65100",
    "#1565c0",
    "#2e7d32",
  ];
  function getColor(colIndex) {
    return colColors[colIndex % colColors.length];
  }

  /* Carry Row */
  grid.appendChild(document.createElement("div"));
  carry.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell carry";
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input carry-input answer-input";
      input.maxLength = 2;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Place Value Row */
  if (place) {
    grid.appendChild(document.createElement("div"));
    place.forEach((val, colIdx) => {
      const cell = document.createElement("div");
      cell.className = "cell place";
      cell.innerText = val ?? "";
      cell.style.color = getColor(colIdx);
      grid.appendChild(cell);
    });
  }

  /* Top Row */
  grid.appendChild(document.createElement("div"));
  top.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell digit";
    cell.style.color = getColor(colIdx);
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Bottom Row */
  const signCell = document.createElement("div");
  signCell.className = "cell plus";
  signCell.innerText = question.layout.sign || "+";
  grid.appendChild(signCell);

  bottom.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell digit";
    cell.style.color = getColor(colIdx);
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Separator Line */
  const line = document.createElement("div");
  line.className = "addition-line";
  line.style.gridColumn = `1 / span ${cols + 1}`;
  grid.appendChild(line);

  /* Result Row */
  grid.appendChild(document.createElement("div"));
  result.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell result";
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
      cell.style.color = getColor(colIdx);
    }
    grid.appendChild(cell);
  });

  optionsElement.appendChild(grid);

  /* Restore saved answers */
  const saved = Ansgiven[index];
  if (saved && Array.isArray(saved)) {
    grid
      .querySelectorAll(".addition-input:not(.carry-input)")
      .forEach((inp, i) => {
        inp.value = saved[i] || "";
      });
  }
}

// ============================================================
// AREA MODEL — render, load, answer helpers
// ============================================================

function renderAreaModelQuestion(q) {
  var am = q.area_model;
  var numRows = am.cells.length;
  var numCols = am.col_parts.length;
  var cellW = numCols >= 3 ? 110 : 130;
  var cellH = 80;
  var inputW = numCols >= 3 ? 72 : 80;
  var cornerW = am.corner_width || 100;

  var html =
    '<div style="display:flex;justify-content:center;align-items:center;margin-top:10px;flex-wrap:wrap;gap:20px;">';
  html +=
    '<div style="display:flex;flex-direction:column;align-items:center;">';

  var hasCorner = am.col_parts_position === "bottom";
  html +=
    '<div style="display:grid;grid-template-columns:' +
    cornerW +
    "px repeat(" +
    numCols +
    ", " +
    cellW +
    "px);grid-template-rows:" +
    (hasCorner
      ? "repeat(" + numRows + ", " + cellH + "px) 50px"
      : "50px repeat(" + numRows + ", " + cellH + "px)") +
    ';gap:0;border:2px solid #555;box-sizing:border-box;">';

  var headerRowIndex = hasCorner ? numRows : 0;
  var dataRowStart = hasCorner ? 0 : 1;

  var cornerLabelHTML = am.corner_label
    ? '<div style="display:flex;align-items:center;justify-content:center;text-align:center;font-size:0.75em;font-weight:bold;color:#333;line-height:1.2;padding:4px;">' +
      am.corner_label +
      "</div>"
    : "";
  html +=
    '<div style="grid-column:1;grid-row:' +
    (headerRowIndex + 1) +
    ';box-sizing:border-box;background:transparent;">' +
    cornerLabelHTML +
    "</div>";

  am.col_parts.forEach(function (cp, c) {
    html +=
      '<div style="grid-column:' +
      (c + 2) +
      ";grid-row:" +
      (headerRowIndex + 1) +
      ";box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-size:1.1em;font-weight:bold;color:#333;line-height:1.2;padding:4px;white-space:normal;word-wrap:break-word;background:" +
      (cp ? "#fbbf24" : "transparent") +
      ";border:" +
      (cp ? "2px solid #555" : "none") +
      ';">' +
      cp +
      "</div>";
  });

  for (var r = 0; r < numRows; r++) {
    var rp = am.row_parts[r];
    html +=
      '<div style="grid-column:1;grid-row:' +
      (r + dataRowStart + 1) +
      ";box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-size:1em;font-weight:bold;color:#333;line-height:1.2;padding:4px;white-space:normal;word-wrap:break-word;background:" +
      (rp ? "#fbbf24" : "transparent") +
      ";border:" +
      (rp ? "2px solid #555" : "none") +
      ';">' +
      rp +
      "</div>";
  }

  for (var r = 0; r < numRows; r++) {
    for (var c = 0; c < numCols; c++) {
      var cellVal = am.cells[r][c];
      var isPower = (am.power_cells || []).some(function (pc) {
        return pc[0] === r && pc[1] === c;
      });
      var cellHtml = "";
      if (cellVal === "disable") {
        cellHtml =
          '<input type="text" class="answer-input" id="am_cell_' +
          r +
          "_" +
          c +
          '" disabled style="width:' +
          inputW +
          'px;height:44px;border:2px solid #999;border-radius:8px;text-align:center;font-size:1.1em;font-weight:bold;background:#c8c8c8;color:#999;cursor:not-allowed;outline:none;" autocomplete="off"/>';
      } else if (cellVal === null || cellVal === "") {
        if (isPower) {
          cellHtml =
            '<div style="display:inline-flex;align-items:flex-start;gap:2px;">' +
            '<input type="text" class="answer-input" id="am_cell_' +
            r +
            "_" +
            c +
            '_base" style="width:' +
            (inputW - 10) +
            'px;height:44px;border:2px solid #667eea;border-radius:8px;text-align:center;font-size:1.1em;font-weight:bold;background:rgba(255,255,255,0.85);outline:none;" autocomplete="off"/>' +
            '<input type="text" class="answer-input" id="am_cell_' +
            r +
            "_" +
            c +
            '_exp" style="width:26px;height:26px;border:2px solid #667eea;border-radius:8px;text-align:center;font-size:0.7em;font-weight:bold;background:rgba(255,255,255,0.85);outline:none;position:relative;margin-top:-10px;" autocomplete="off"/>' +
            "</div>";
        } else {
          cellHtml =
            '<input type="text" class="answer-input" id="am_cell_' +
            r +
            "_" +
            c +
            '" style="width:' +
            inputW +
            'px;height:44px;border:2px solid #667eea;border-radius:8px;text-align:center;font-size:1.1em;font-weight:bold;background:rgba(255,255,255,0.85);outline:none;" autocomplete="off"/>';
        }
      } else {
        cellHtml = "<span>" + cellVal + "</span>";
      }
      html +=
        '<div style="grid-column:' +
        (c + 2) +
        ";grid-row:" +
        (r + dataRowStart + 1) +
        ';box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:2px solid #555;font-size:1.25em;font-weight:bold;background:#f0f0f0;">' +
        cellHtml +
        "</div>";
    }
  }

  html += "</div></div>";

  if (am.equation_rows && am.equation_rows.length) {
    html +=
      '<div style="display:flex;flex-direction:column;gap:14px;justify-content:center;font-size:1.1em;font-weight:bold;color:#333;">';
    if (am.therefore) {
      html += "<div>Therefore,</div><div>" + am.therefore + "</div>";
    }
    am.equation_rows.forEach(function (row, rowIdx) {
      html +=
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
      html += '<span style="white-space:nowrap;">' + row.prefix + "</span>";
      row.parts.forEach(function (part, partIdx) {
        if (part.type === "dropdown") {
          html +=
            '<select class="answer-input" id="am_eq_' +
            rowIdx +
            "_" +
            partIdx +
            '" style="width:65px;height:52px;font-size:1em;border:2px solid #667eea;border-radius:8px;background:white;outline:none;"><option value=""></option>' +
            part.options
              .map(function (o) {
                return '<option value="' + o + '">' + o + "</option>";
              })
              .join("") +
            "</select>";
        } else if (part.type === "input") {
          html +=
            '<input type="text" class="answer-input" id="am_eq_' +
            rowIdx +
            "_" +
            partIdx +
            '" style="width:60px;height:52px;border:2px solid #667eea;border-radius:8px;text-align:center;font-size:1em;font-weight:bold;background:rgba(255,255,255,0.85);outline:none;" autocomplete="off"/>';
        }
      });
      html += "</div>";
    });
    html += "</div>";
  }

  html += "</div>";
  return html;
}

function loadAreaModelQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;";
  questionContainer.innerHTML = renderAreaModelQuestion(randomQuestion);
  optionsElement.appendChild(questionContainer);

  optionsElement.querySelectorAll(".answer-input").forEach(function (input) {
    input.addEventListener("input", function () {
      updateButtonVisibility();
    });
    input.addEventListener("keyup", function (e) {
      if (e.key === "Enter") checkAnswer();
    });
  });

  var prev = Ansgiven[index];
  if (prev && Array.isArray(prev)) {
    var inputs = Array.from(
      optionsElement.querySelectorAll(".answer-input"),
    ).filter(function (inp) {
      return !inp.disabled;
    });
    inputs.forEach(function (input, idx) {
      if (prev[idx] !== undefined) input.value = prev[idx];
    });
  }
}

function flattenAreaModelCorrectAnswers(areaModel) {
  var correct = [];
  var numRows = areaModel.cells.length;
  var numCols = areaModel.col_parts.length;
  for (var r = 0; r < numRows; r++) {
    for (var c = 0; c < numCols; c++) {
      if (areaModel.cells[r][c] === null || areaModel.cells[r][c] === "") {
        var cellAns = areaModel.cell_answers[r][c];
        if (Array.isArray(cellAns)) {
          correct.push(cellAns[0]);
          correct.push(cellAns[1]);
        } else {
          correct.push(cellAns);
        }
      }
    }
  }
  if (areaModel.equation_rows && areaModel.equation_rows.length) {
    areaModel.equation_rows.forEach(function (row) {
      row.parts.forEach(function (part) {
        if (part.type === "dropdown" || part.type === "input") {
          correct.push(part.correct);
        }
      });
    });
  }
  return correct;
}

function buildAreaModelResultHTML(q, answers, correctAnswers, showColors) {
  var am = q.area_model;
  var numRows = am.cells.length;
  var numCols = am.col_parts.length;
  var idx = 0;
  var cellH = 36;
  var cellW = numCols >= 3 ? 52 : 64;
  var cornerW = am.corner_width_result || 54;

  var gridHtml =
    '<div style="display:flex;flex-direction:column;align-items:center;box-shadow:none;border:none;outline:none;background:transparent;">';
  var hasCorner = am.col_parts_position === "bottom";
  gridHtml +=
    '<div style="display:grid;grid-template-columns:' +
    cornerW +
    "px repeat(" +
    numCols +
    ", " +
    cellW +
    "px);grid-template-rows:" +
    (hasCorner
      ? "repeat(" + numRows + ", " + cellH + "px) 42px"
      : "42px repeat(" + numRows + ", " + cellH + "px)") +
    ';gap:0;border:2px solid #555;box-sizing:border-box;">';

  var headerRowIndex = hasCorner ? numRows : 0;
  var dataRowStart = hasCorner ? 0 : 1;

  var cornerLabelHTML = am.corner_label
    ? '<div style="display:flex;align-items:center;justify-content:center;text-align:center;font-size:0.6em;font-weight:bold;line-height:1.1;">' +
      am.corner_label +
      "</div>"
    : "";
  gridHtml +=
    '<div style="grid-column:1;grid-row:' +
    (headerRowIndex + 1) +
    ';box-sizing:border-box;background:transparent;">' +
    cornerLabelHTML +
    "</div>";

  am.col_parts.forEach(function (cp, c) {
    gridHtml +=
      '<div style="grid-column:' +
      (c + 2) +
      ";grid-row:" +
      (headerRowIndex + 1) +
      ";box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-size:0.8em;font-weight:bold;color:#333;line-height:1.1;padding:2px;white-space:normal;word-wrap:break-word;background:" +
      (cp ? "#fbbf24" : "transparent") +
      ";border:" +
      (cp ? "2px solid #555" : "none") +
      ';">' +
      cp +
      "</div>";
  });

  for (var r = 0; r < numRows; r++) {
    var rp = am.row_parts[r];
    gridHtml +=
      '<div style="grid-column:1;grid-row:' +
      (r + dataRowStart + 1) +
      ";box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-size:0.55em;font-weight:bold;color:#333;line-height:1;padding:1px;overflow:hidden;white-space:normal;word-wrap:break-word;background:" +
      (rp ? "#fbbf24" : "transparent") +
      ";border:" +
      (rp ? "2px solid #555" : "none") +
      ';">' +
      rp +
      "</div>";
  }

  for (var r = 0; r < numRows; r++) {
    for (var c = 0; c < numCols; c++) {
      var cellVal = am.cells[r][c];
      var cellHtml = "";
      var cellBg = "#f0f0f0";
      if (cellVal === "disable") {
        cellHtml =
          '<span style="display:inline-block;width:100%;height:100%;background:#c8c8c8;"></span>';
        cellBg = "#c8c8c8";
      } else if (cellVal === null || cellVal === "") {
        var value = answers && answers[idx] !== undefined ? answers[idx] : "";
        var correctValue =
          correctAnswers && correctAnswers[idx] !== undefined
            ? correctAnswers[idx]
            : "";
        var color = "#111";
        if (showColors) {
          var isOk = compareAnswers(value, correctValue);
          color = isOk ? "#155724" : "#721c24";
          cellBg = isOk ? "#d4edda" : "#f8d7da";
        }
        cellHtml =
          '<span style="color:' +
          color +
          ';font-weight:700;">' +
          (value || "") +
          "</span>";
        idx += 1;
      } else {
        cellHtml = "<span>" + cellVal + "</span>";
      }
      gridHtml +=
        '<div style="grid-column:' +
        (c + 2) +
        ";grid-row:" +
        (r + dataRowStart + 1) +
        ";box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:2px solid #555;font-size:1em;font-weight:bold;background:" +
        cellBg +
        ';">' +
        cellHtml +
        "</div>";
    }
  }

  gridHtml += "</div></div>";

  var eqHtml = "";
  if (am.equation_rows && am.equation_rows.length) {
    eqHtml +=
      '<div style="display:flex;flex-direction:column;gap:10px;justify-content:center;font-size:0.95em;font-weight:bold;color:#333;">';
    if (am.therefore) {
      eqHtml += "<div>Therefore,</div><div>" + am.therefore + "</div>";
    }
    am.equation_rows.forEach(function (row) {
      eqHtml +=
        '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">';
      eqHtml += '<span style="white-space:nowrap;">' + row.prefix + "</span>";
      row.parts.forEach(function (part) {
        if (part.type === "dropdown" || part.type === "input") {
          var value = answers && answers[idx] !== undefined ? answers[idx] : "";
          var correctValue =
            correctAnswers && correctAnswers[idx] !== undefined
              ? correctAnswers[idx]
              : "";
          var color = "#111";
          var boxBg = "#fafafa";
          var borderColor = "#555";
          if (showColors) {
            var isOk = compareAnswers(value, correctValue);
            color = isOk ? "#155724" : "#721c24";
            boxBg = isOk ? "#d4edda" : "#f8d7da";
            borderColor = isOk ? "#4caf50" : "#f44336";
          }
          eqHtml +=
            '<span style="width:52px;height:44px;border:2px solid ' +
            borderColor +
            ";border-radius:8px;display:inline-flex;justify-content:center;align-items:center;color:" +
            color +
            ";background:" +
            boxBg +
            ';font-size:1em;font-weight:bold;">' +
            (value || "") +
            "</span>";
          idx += 1;
        }
      });
      eqHtml += "</div>";
    });
    eqHtml += "</div>";
  }

  return (
    '<div style="display:flex;justify-content:center;align-items:center;margin-top:10px;flex-wrap:wrap;gap:16px;">' +
    gridHtml +
    eqHtml +
    "</div>"
  );
}

// ============================================================
// LOAD QUESTION ROUTER
// ============================================================

function loadQuestion(index) {
  var randomQuestion = questions[index];

  if (!randomQuestion) {
    console.error("No question found at index:", index);
    return;
  }

  var questionElement = document.getElementById("question");
  if (!questionElement) {
    console.error("question element not found");
    return;
  }

  if (
    (randomQuestion.input && Array.isArray(randomQuestion.input)) ||
    randomQuestion.displayType === "table"
  ) {
    questionElement.innerHTML = "";
  } else {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionElement);
    } else {
      questionElement.innerHTML = randomQuestion.question;
    }
  }

  var picDiv = document.getElementById("picdiv");
  if (picDiv) {
    picDiv.innerHTML = "";

    if (randomQuestion.image) {
      const element = document.querySelector(".question-image-area");
      if (element) element.style.display = "block";
      picDiv.style.display = "flex";
      const questionQuentent = document.querySelector(".question-content");
      if (questionQuentent) questionQuentent.style.display = "flex";
      var questionImage = document.createElement("img");
      questionImage.src = randomQuestion.image;
      questionImage.alt = "Question Image";
      questionImage.style.maxWidth = "90%";
      questionImage.style.maxHeight = "250px";
      questionImage.style.objectFit = "contain";
      questionImage.style.borderRadius = "8px";
      picDiv.appendChild(questionImage);
    } else {
      picDiv.style.display = "none";
      const element = document.querySelector(".question-image-area");
      if (element) element.style.display = "none";
      const questionQuentent = document.querySelector(".question-content");
      if (questionQuentent) questionQuentent.style.display = "block";
    }
  }

  if (randomQuestion.questionSound) {
    var soundButton = document.createElement("button");
    soundButton.className = "btn btn-sound";
    soundButton.innerText = "🔊 Play Sound";
    soundButton.onclick = function () {
      var sound = new Audio(randomQuestion.questionSound);
      sound.play();
    };
    if (
      !(
        (randomQuestion.input && Array.isArray(randomQuestion.input)) ||
        randomQuestion.displayType === "table"
      )
    ) {
      questionElement.appendChild(soundButton);
    }
  }

  var optionsElement = document.getElementById("options");
  if (!optionsElement) {
    console.error("options element not found");
    return;
  }

  optionsElement.innerHTML = "";

  if (randomQuestion.type === "addition") {
    renderAdditionQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "lcm-division") {
    renderLCMDivision(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "long-division") {
    optionsElement.style.display = "flex";
    optionsElement.style.justifyContent = "center";
    optionsElement.style.alignItems = "center";
    renderLongDivision(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "tree") {
    renderTreeQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "value-table") {
    loadValueTableQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "table-graph") {
    loadTableGraphQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "graph") {
    loadGraphQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.area_model) {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionElement);
    } else {
      questionElement.innerHTML = randomQuestion.question;
    }
    loadAreaModelQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.longDivisionSq) {
    loadInputQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.input && Array.isArray(randomQuestion.input)) {
    loadInputQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.tableStructure) {
    loadTableQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.options) {
    loadOptionQuestion(randomQuestion, optionsElement, index);
  }

  updateButtonVisibility();
  updateButtonStyles();
  updateButtonText();
}

// ============================================================
// INPUT QUESTION LOADER — MERGED (File 1 + File 2 fraction inputs)
// ============================================================

function loadInputQuestion(randomQuestion, optionsElement, index) {
  /* ---------- TABLE QUESTIONS ---------- */
  if (randomQuestion.displayType === "table" && randomQuestion.tableStructure) {
    loadTableQuestion(randomQuestion, optionsElement, index);
    return;
  }

  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  const questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.display = "flex";
  questionContainer.style.flexWrap = "wrap";
  questionContainer.style.justifyContent = "center";
  questionContainer.style.alignItems = "center";
  questionContainer.style.gap = "6px";
  questionContainer.style.fontSize = "1.4em";
  questionContainer.style.fontWeight = "bold";
  questionContainer.style.marginBottom = "20px";

  let inputIndex = 0;

  /* =========================================================
     ARRAY QUESTION — fractions with blank whole/num/den inputs
  ========================================================= */
  if (Array.isArray(randomQuestion.question)) {
    randomQuestion.question.forEach((part) => {
      if (typeof part === "string") {
        // Split by <br> first
        const brParts = part.split("<br>");

        brParts.forEach((line, lineIdx) => {
          // Split each line by BOTH dropdown, superscript, and normal placeholders
          const tokenRegex =
            /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;
          const pieces = line.split(tokenRegex);

          pieces.forEach((piece) => {
            // Dropdown
            if (
              piece === "<drop>______</drop>" &&
              randomQuestion.type === "drop-down"
            ) {
              // Support per-dropdown options via `dropdowns` object (keyed by inputIndex)
              // or array (indexed by inputIndex), fallback to `operators`
              var dropOptions;
              var dd = randomQuestion.dropdowns;
              if (
                dd &&
                typeof dd === "object" &&
                !Array.isArray(dd) &&
                dd[String(inputIndex)]
              ) {
                dropOptions = dd[String(inputIndex)];
              } else if (Array.isArray(dd) && dd[inputIndex] !== undefined) {
                dropOptions = dd[inputIndex];
              } else if (Array.isArray(randomQuestion.operators)) {
                dropOptions = randomQuestion.operators;
              } else {
                dropOptions = [];
              }

              const select = document.createElement("select");
              select.className = "answer-input dropdown-input";
              const def = document.createElement("option");
              def.value = "";
              def.textContent = "";
              select.appendChild(def);
              dropOptions.forEach((op) => {
                const opt = document.createElement("option");
                opt.value = op;
                opt.textContent = op;
                select.appendChild(opt);
              });
              select.addEventListener("change", handleInputAnswerChange);
              questionContainer.appendChild(select);
              inputIndex++;
            }

            // Superscript input
            else if (piece === "<sup>______</sup>") {
              const supWrapper = document.createElement("sup");
              const input = document.createElement("input");
              input.type = "text";
              input.className = "answer-input sup-input";
              input.style.width = "45px";
              input.style.height = "30px";
              input.style.fontSize = "0.8em";
              input.style.textAlign = "center";
              input.style.border = "1px solid blue";
              input.style.borderRadius = "4px";
              input.style.padding = "2px";
              input.addEventListener("input", handleInputAnswerChange);
              supWrapper.appendChild(input);
              questionContainer.appendChild(supWrapper);
              inputIndex++;
            }

            // Normal input placeholder
            else if (piece === "______") {
              if (inputIndex < randomQuestion.input.length) {
                addInputField(
                  questionContainer,
                  randomQuestion.input[inputIndex],
                );
                inputIndex++;
              }
            }

            // Text
            else if (piece.trim()) {
              const span = document.createElement("span");
              span.innerHTML = piece;
              questionContainer.appendChild(span);
            }
          });

          // Line break between <br> splits
          if (lineIdx < brParts.length - 1) {
            questionContainer.appendChild(document.createElement("br"));
            const lb = document.createElement("div");
            lb.style.flexBasis = "100%";
            questionContainer.appendChild(lb);
          }
        });
      }

      // ── FRACTION PART — supports blank whole, numerator (array or string), denominator ──
      else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;

        const span = document.createElement("span");
        span.className = "mixed-fraction";

        const wholeSpan = document.createElement("span");
        wholeSpan.className = "whole";

        const fractionSpan = document.createElement("span");
        fractionSpan.className = "fraction";

        const numeratorSpan = document.createElement("span");
        numeratorSpan.className = "numerator";

        const denominatorSpan = document.createElement("span");
        denominatorSpan.className = "denominator";

        // Whole: blank or fixed
        if (whole === "______") {
          wholeSpan.innerHTML = "";
          let input = createInputElement(randomQuestion.input[inputIndex]);
          wholeSpan.appendChild(input);
          inputIndex++;
        } else {
          wholeSpan.innerHTML = whole ? whole : "&nbsp;";
        }

        // Numerator: array of items, blank, or fixed
        if (Array.isArray(numerator)) {
          numerator.forEach((item) => {
            if (item === "______") {
              numeratorSpan.appendChild(
                createInputElement(randomQuestion.input[inputIndex]),
              );
              inputIndex++;
            } else if (item && typeof item === "object" && "sup" in item) {
              const supEl = document.createElement("sup");
              if (item.sup === "______") {
                const supInput = document.createElement("input");
                supInput.type = "text";
                supInput.className = "answer-input sup-input";
                supInput.style.width = "28px";
                supInput.style.height = "24px";
                supInput.style.fontSize = "0.75em";
                supInput.style.textAlign = "center";
                supInput.style.border = "1px solid blue";
                supInput.style.borderRadius = "4px";
                supInput.style.padding = "1px";
                supInput.addEventListener("input", handleInputAnswerChange);
                supEl.appendChild(supInput);
                inputIndex++;
              } else {
                supEl.textContent = item.sup;
              }
              numeratorSpan.appendChild(supEl);
            } else {
              const opSpan = document.createElement("span");
              opSpan.textContent = " " + item + " ";
              opSpan.style.cssText = "font-weight:bold;font-size:0.9em;";
              numeratorSpan.appendChild(opSpan);
            }
          });
        } else if (numerator === "______") {
          numeratorSpan.appendChild(
            createInputElement(randomQuestion.input[inputIndex]),
          );
          inputIndex++;
        } else {
          numeratorSpan.innerHTML = numerator;
        }

        // Denominator: blank or fixed
        if (denominator === "______") {
          let input = createInputElement(randomQuestion.input[inputIndex]);
          denominatorSpan.appendChild(input);
          inputIndex++;
        } else {
          denominatorSpan.innerHTML = denominator;
        }

        fractionSpan.appendChild(numeratorSpan);
        fractionSpan.appendChild(denominatorSpan);
        span.appendChild(wholeSpan);
        span.appendChild(fractionSpan);
        questionContainer.appendChild(span);
      } else if (part.root) {
        // Root object — render √ or ∛ with overline
        const span = document.createElement("span");
        if (part.root.value === "______") {
          span.innerHTML = renderRoot(part.root);
          const inp = span.querySelector("input");
          if (inp) {
            inp.addEventListener("input", handleInputAnswerChange);
            inputIndex++;
          }
        } else {
          span.innerHTML = renderRoot(part.root);
        }
        questionContainer.appendChild(span);
      }
    });
  } else if (typeof randomQuestion.question === "string") {
    /* =========================================================
     STRING QUESTION — simple inputs + dropdowns
  ========================================================= */
    const brParts = randomQuestion.question.split("<br>");

    brParts.forEach((line, lineIdx) => {
      const tokenRegex = /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;
      const parts = line.split(tokenRegex);

      parts.forEach((part) => {
        if (
          part === "<drop>______</drop>" &&
          randomQuestion.type === "drop-down"
        ) {
          // Support per-dropdown options via `dropdowns` object (keyed by inputIndex)
          // or array (indexed by inputIndex), fallback to `operators`
          var dropOptions;
          var dd = randomQuestion.dropdowns;
          if (
            dd &&
            typeof dd === "object" &&
            !Array.isArray(dd) &&
            dd[String(inputIndex)]
          ) {
            dropOptions = dd[String(inputIndex)];
          } else if (Array.isArray(dd) && dd[inputIndex] !== undefined) {
            dropOptions = dd[inputIndex];
          } else if (Array.isArray(randomQuestion.operators)) {
            dropOptions = randomQuestion.operators;
          } else {
            dropOptions = [];
          }

          const select = document.createElement("select");
          select.className = "answer-input dropdown-input";
          const def = document.createElement("option");
          def.value = "";
          def.textContent = "";
          select.appendChild(def);
          dropOptions.forEach((op) => {
            const opt = document.createElement("option");
            opt.value = op;
            opt.textContent = op;
            select.appendChild(opt);
          });
          select.addEventListener("change", handleInputAnswerChange);
          questionContainer.appendChild(select);
          inputIndex++;
        } else if (part === "<sup>______</sup>") {
          const supWrapper = document.createElement("sup");
          const input = document.createElement("input");
          input.type = "text";
          input.className = "answer-input sup-input";
          input.style.width = "45px";
          input.style.height = "30px";
          input.style.fontSize = "0.8em";
          input.style.textAlign = "center";
          input.style.border = "1px solid blue";
          input.style.borderRadius = "4px";
          input.style.padding = "2px";
          input.addEventListener("input", handleInputAnswerChange);
          supWrapper.appendChild(input);
          questionContainer.appendChild(supWrapper);
          inputIndex++;
        } else if (part === "______") {
          if (inputIndex < randomQuestion.input.length) {
            addInputField(questionContainer, randomQuestion.input[inputIndex]);
            inputIndex++;
          }
        } else if (part.trim()) {
          const span = document.createElement("span");
          span.innerHTML = part;
          questionContainer.appendChild(span);
        }
      });

      if (lineIdx < brParts.length - 1) {
        questionContainer.appendChild(document.createElement("br"));
        const lb = document.createElement("div");
        lb.style.flexBasis = "100%";
        questionContainer.appendChild(lb);
      }
    });
  }

  // ── longDivisionSq renderer ──────────────────────────────────────────────
  if (randomQuestion.longDivisionSq) {
    const ldWrapper = document.createElement("div");
    ldWrapper.style.cssText =
      "display:grid;grid-template-columns:minmax(40px,auto) 4px minmax(130px,auto) 4px minmax(40px,auto);" +
      "row-gap:0px;align-items:stretch;font-size:1.05em;font-weight:bold;" +
      "margin:15px auto;width:max-content;text-align:center;";

    let ldHtml = "";
    randomQuestion.longDivisionSq.forEach((row) => {
      ldHtml += `<div style="display:flex;align-items:center;justify-content:flex-end;padding-right:10px;">${row.left || ""}</div>`;
      ldHtml += `<div style="${row.leftBracket ? "border-left:3px solid #000;" : ""}"></div>`;
      let mainStyles =
        "padding:5px 0px;text-align:left;position:relative;min-height:55px;display:flex;align-items:center;";
      if (row.topBar) mainStyles += "border-top:3px solid #000;";
      if (row.bottomLine) mainStyles += "border-bottom:3px solid #000;";
      ldHtml += `<div style="${mainStyles}"><div style="width:100%;white-space:nowrap;">${row.inside || ""}</div></div>`;
      ldHtml += `<div style="${row.rightBracket ? "border-right:3px solid #000;" : ""}"></div>`;
      ldHtml += `<div style="display:flex;align-items:center;padding-left:10px;">${row.right || ""}</div>`;
    });

    // Replace _____ placeholders with input boxes
    ldHtml = ldHtml.replace(/_{3,}/g, () => {
      const id = inputIndex;
      inputIndex++;
      return `<input type="text" class="answer-input" autocomplete="off"
        style="width:40px;height:40px;border:3px solid #ccc;border-radius:6px;
               font-size:1.1em;font-weight:bold;text-align:center;background:white;
               outline:none;padding:0;margin:2px;" />`;
    });

    ldWrapper.innerHTML = ldHtml;
    questionContainer.appendChild(ldWrapper);

    // questionAfter — rendered below the grid
    if (randomQuestion.questionAfter) {
      const afterDiv = document.createElement("div");
      afterDiv.style.cssText =
        "flex-basis:100%;margin-top:10px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:center;";
      const parts = Array.isArray(randomQuestion.questionAfter)
        ? randomQuestion.questionAfter
        : [randomQuestion.questionAfter];
      parts.forEach((p) => {
        if (typeof p === "string") {
          // Replace ______ with input
          const pieces = p.split("______");
          pieces.forEach((piece, pi) => {
            if (piece) {
              const s = document.createElement("span");
              s.innerHTML = piece;
              afterDiv.appendChild(s);
            }
            if (pi < pieces.length - 1) {
              const inp = document.createElement("input");
              inp.type = "text";
              inp.className = "answer-input";
              inp.style.cssText =
                "width:60px;height:36px;border:2px solid #007bff;border-radius:6px;" +
                "font-size:1em;font-weight:bold;text-align:center;background:white;";
              inp.addEventListener("input", handleInputAnswerChange);
              afterDiv.appendChild(inp);
              inputIndex++;
            }
          });
        } else if (p.root) {
          const s = document.createElement("span");
          s.innerHTML = renderRoot(p.root);
          afterDiv.appendChild(s);
        }
      });
      questionContainer.appendChild(afterDiv);
    }
  }

  optionsElement.appendChild(questionContainer);

  /* Restore previous answers */
  const previous = Ansgiven[index];
  if (Array.isArray(previous)) {
    const inputs = questionContainer.querySelectorAll(".answer-input");
    inputs.forEach((el, i) => {
      if (previous[i] !== undefined) {
        el.value = previous[i];
      }
    });
  }
}

// ============================================================
// INPUT ELEMENT HELPERS
// ============================================================

function addInputField(container, inputField) {
  let inputElement = createInputElement(inputField);
  container.appendChild(inputElement);
}

function createInputElement(inputField) {
  let inputElement = document.createElement("input");
  inputElement.type = "text";
  inputElement.className = "answer-input";
  inputElement.style.padding = "8px";
  inputElement.style.fontSize = "1em";
  inputElement.style.border = "2px solid #ccc";
  inputElement.style.borderRadius = "6px";
  inputElement.style.textAlign = "center";
  inputElement.style.minWidth = "60px";
  inputElement.style.width = "60px";
  inputElement.style.boxSizing = "content-box";

  function autoGrow() {
    const len = inputElement.value.length || 1;
    inputElement.style.width = Math.max(60, len * 16 + 16) + "px";
  }

  inputElement.addEventListener("input", function () {
    autoGrow();
    handleInputAnswerChange();
  });

  // In case a saved answer is restored later (value set programmatically),
  // trigger a resize once it's added to the DOM.
  setTimeout(autoGrow, 0);

  return inputElement;
}

// ============================================================
// OPTION QUESTION LOADER — with textParts + fraction support
// ============================================================

function loadOptionQuestion(randomQuestion, optionsElement, index) {
  var hasImageOptions = randomQuestion.options.some((option) => option.image);
  var hasTextOnlyOptions = randomQuestion.options.every(
    (option) => !option.image,
  );

  if (hasImageOptions) {
    optionsElement.style.display = "grid";
    optionsElement.style.gridTemplateColumns = "repeat(2, 1fr)";
    optionsElement.style.gap = "1rem";
    optionsElement.style.justifyContent = "center";
    optionsElement.classList.remove("text-only");
  } else if (hasTextOnlyOptions) {
    optionsElement.classList.add("text-only");
    optionsElement.classList.remove("input-question");
  }

  var selectedLi = null;

  randomQuestion.options.forEach(function (option, idx) {
    var li = document.createElement("li");
    li.classList.add("option-container");
    li.setAttribute("onclick", "optionContainer()");
    li.onclick = function () {
      if (selectedLi) selectedLi.style.border = "";
      selectedLi = li;
    };

    var radioButton = document.createElement("input");
    radioButton.type = "radio";
    radioButton.name = "answer";
    radioButton.value = idx;
    radioButton.style.display = "none";

    if (option.image) {
      var optionWithImage = document.getElementById("options");
      if (optionWithImage) optionWithImage.style.gap = "1rem";
      var optionImage = document.createElement("img");
      optionImage.src = option.image;
      optionImage.alt = "Option Image";
      optionImage.style.width = "100%";
      optionImage.style.maxHeight = "100px";
      optionImage.style.cursor = "pointer";
      optionImage.style.border = "3px solid black";

      optionImage.onclick = function () {
        radioButton.checked = true;
        optionsElement.querySelectorAll("img").forEach((img) => {
          img.style.border = "3px solid black";
        });
        optionImage.style.border = "3px solid #007bff";
        handleAnswerChange();
      };

      optionImage.onmouseover = function () {
        if (option.sound) playOptionSound(option.sound);
      };

      li.appendChild(optionImage);
    } else {
      var optionWithText = document.getElementById("options");
      if (optionWithText) optionWithText.style.display = "grid";

      var optionTextButton = document.createElement("button");
      optionTextButton.type = "button";    
      optionTextButton.className = "btnOption";

      // ── textParts support (mixed text + fraction) ──
      if (option.textParts) {
        option.textParts.forEach((part) => {
          if (typeof part === "string") {
            optionTextButton.innerHTML += part;
          } else if (part.fraction) {
            const { whole, numerator, denominator } = part.fraction;
            optionTextButton.innerHTML += `
              <span class="mixed-fraction">
                <span class="whole">${whole || ""}</span>
                <span class="fraction">
                  <span class="numerator">${numerator}</span>
                  <span class="denominator">${denominator}</span>
                </span>
              </span>
            `;
          }
        });
      }
      // ── fraction-only option ──
      else if (option.fraction) {
        const { whole, numerator, denominator } = option.fraction;
        optionTextButton.innerHTML = `
          <span class="mixed-fraction">
            <span class="whole">${whole || ""}</span>
            <span class="fraction">
              <span class="numerator">${numerator}</span>
              <span class="denominator">${denominator}</span>
            </span>
          </span>
        `;
      }
      // ── plain text ──
      else {
        optionTextButton.innerHTML = option.text;
      }

      optionTextButton.onclick = function () {
        radioButton.checked = true;
        var allOptionButtons = document.querySelectorAll(".btnOption");
        allOptionButtons.forEach((btn) => {
          btn.style.backgroundColor = "";
          btn.style.border = "";
        });
        optionTextButton.style.backgroundColor = "#e3f2fd";
        optionTextButton.style.border = "2px solid #007bff";
        optionTextButton.style.color = "black";
        handleAnswerChange();
      };

      li.appendChild(optionTextButton);
    }

    li.appendChild(radioButton);
    optionsElement.appendChild(li);
  });

  // Restore previously selected answer
  var previouslySelected = Ansgiven[index];
  if (previouslySelected !== null && previouslySelected !== undefined) {
    var previouslySelectedElement = optionsElement.querySelector(
      'input[name="answer"][value="' + previouslySelected + '"]',
    );
    if (previouslySelectedElement) {
      previouslySelectedElement.checked = true;
      var previouslySelectedLi = previouslySelectedElement.closest("li");
      if (previouslySelectedLi) {
        selectedLi = previouslySelectedLi;
        var textButton = previouslySelectedLi.querySelector(".btnOption");
        if (textButton) {
          textButton.style.backgroundColor = "#e3f2fd";
          textButton.style.border = "2px solid #007bff";
          textButton.style.color = "black";
        }
        var img = previouslySelectedLi.querySelector("img");
        if (img) {
          optionsElement
            .querySelectorAll("img")
            .forEach((im) => (im.style.border = "3px solid black"));
          img.style.border = "3px solid #007bff";
        }
      }
    }
  }
}

// ============================================================
// ANSWER CHANGE HANDLERS
// ============================================================

function handleInputAnswerChange() {
  const subbtn = document.getElementById("subbtn");
  const nextbtn = document.getElementById("nextbtn");
  if (subbtn) subbtn.style.display = "inline-block";
  if (nextbtn) nextbtn.style.display = "none";
}

function playOptionSound(option) {
  var sound = new Audio(option);
  sound.play();
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getOptionLabel(option) {
  if (option.endsWith && option.endsWith(".mp3")) {
    var label = option.split("/").pop().replace(".mp3", "");
    return capitalizeFirstLetter(label);
  }
  return option.text || option;
}

function handleAnswerChange() {
  const subbtn = document.getElementById("subbtn");
  const nextbtn = document.getElementById("nextbtn");
  if (subbtn) subbtn.style.display = "inline-block";
  if (nextbtn) nextbtn.style.display = "none";
}

// ============================================================
// NAVIGATION
// ============================================================

function newques() {
  saveCurrentAnswer();
  saveToLocalStorage("currentQuestionIndex", i + 1);

  if (i === count - 1) {
    const questiondiv = document.getElementById("questiondiv");
    if (questiondiv) questiondiv.style.textAlign = "center";

    displayResults();

    const buttonContainer = document.getElementById("buttonContainer");
    if (buttonContainer) buttonContainer.style.display = "none";

    saveToLocalStorage("currentQuestionIndex", null);
  } else {
    i++;
    loadQuestion(i);
    const result = document.getElementById("result");
    const subbtn = document.getElementById("subbtn");
    const nextbtn = document.getElementById("nextbtn");

    if (result) result.innerHTML = "";
    if (subbtn) subbtn.style.display = "inline-block";
    if (nextbtn) nextbtn.style.display = "none";

    updateButtonVisibility();
    updateButtonStyles();
  }
}

// ============================================================
// SAVE CURRENT ANSWER
// ============================================================

function saveCurrentAnswer() {
  var currentQuestion = questions[i];

  if (currentQuestion.area_model) {
    var inputs = document.querySelectorAll(".answer-input");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      if (input.disabled) return;
      var value = input.value.trim();
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "addition") {
    var inputs = document.querySelectorAll(".addition-input:not(.carry-input)");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim();
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "lcm-division") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "long-division") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "tree") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  // ── ADDED: value-table / table-graph — returns early, nothing below changes ──
  if (
    currentQuestion.type === "value-table" ||
    currentQuestion.type === "table-graph"
  ) {
    var vtInputs = [];
    var vtHas = false;
    document.querySelectorAll(".vt-answer-input").forEach(function (input) {
      var value = input.value.trim();
      vtInputs.push(value);
      if (value !== "") vtHas = true;
    });
    if (currentQuestion.type === "value-table") {
      Ansgiven[i] = vtHas ? vtInputs : null;
    } else {
      var pts = vtGraphPoints.slice();
      Ansgiven[i] = vtHas || pts.length ? { inputs: vtInputs, points: pts } : null;
    }
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  // ── ADDED: graph (line-sketching) — returns early, nothing below changes ──
  if (currentQuestion.type === "graph") {
    var glPts = glGraphPoints.slice();
    Ansgiven[i] = glPts.length ? { points: glPts } : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (
    currentQuestion.displayType === "table" &&
    currentQuestion.tableStructure
  ) {
    var inputs = document.querySelectorAll(".table-input");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim().toLowerCase().replace(/,/g, "");
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.input && Array.isArray(currentQuestion.input)) {
    var inputs = document.querySelectorAll(".answer-input, .dropdown-input");
    var inputAnswers = [];
    var hasAnswer = false;

    inputs.forEach(function (input) {
      var value = input.value.trim().toLowerCase().replace(/,/g, "");
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });

    Ansgiven[i] = hasAnswer ? inputAnswers : null;
  } else {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (selectedAnswer) {
      Ansgiven[i] = parseInt(selectedAnswer.value);
    } else {
      Ansgiven[i] = null;
    }
  }

  console.log("score", score);
  saveToLocalStorage("Ansgiven", Ansgiven);
}

// ============================================================
// FORMAT FRACTION FOR DISPLAY (review panels)
// ============================================================

function formatFractionForDisplay(option) {
  if (option && option.fraction) {
    const { whole, numerator, denominator } = option.fraction;
    let fractionHTML = '<span class="display-fraction">';
    if (whole !== undefined && whole !== "" && whole !== null) {
      fractionHTML += `
        <span class="whole-part">${whole}</span>
        <span class="fraction-part">
          <span class="numerator">${numerator}</span>
          <span class="denominator">${denominator}</span>
        </span>
      `;
    } else {
      fractionHTML += `
        <span class="fraction-part">
          <span class="numerator">${numerator}</span>
          <span class="denominator">${denominator}</span>
        </span>
      `;
    }
    fractionHTML += "</span>";
    return fractionHTML;
  }
  return option.text || option;
}

// ============================================================
// STEP VALIDATION HELPERS (from PS1)
// ============================================================

function normalizeAnswer(answer) {
  const value = (answer || "").trim();
  const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (numberPattern.test(value)) return String(Number(value));
  return value.toLowerCase();
}

function compareAnswers(userAnswer, correctAnswer) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

function validatePairs(values, allowed) {
  const counts = {};
  values.forEach(function (v) {
    var k = String(Number(v));
    counts[k] = (counts[k] || 0) + 1;
  });
  for (var key in allowed) {
    if ((counts[key] || 0) !== allowed[key]) return false;
  }
  return true;
}

// Alternate accepted answer sets, e.g. 6/8 is as valid as 3/4 for
//   "answer": ["3", "4"], "altAnswer": [["6", "8"]]
// If what the student wrote matches one alt set IN FULL, that set becomes the
// one they are graded against. The whole set has to match, so a mix of the two
// (6/4) is still wrong. Returns question.answer untouched when there is no
// altAnswer, so questions without the key behave exactly as before.
function resolveAcceptedAnswers(question, answers) {
  var correctAnswers = question.answer;
  if (
    !question ||
    !Array.isArray(question.altAnswer) ||
    !Array.isArray(answers) ||
    !Array.isArray(correctAnswers)
  ) {
    return correctAnswers;
  }
  var alt = question.altAnswer.find(function (set) {
    return (
      Array.isArray(set) &&
      set.length === correctAnswers.length &&
      set.every(function (ca, idx) {
        return compareAnswers(answers[idx], ca);
      })
    );
  });
  return alt || correctAnswers;
}

function buildPerSlotCorrect(answers, correctAnswers, question) {
  if (!correctAnswers) return answers.map(() => null);

  // grade against whichever accepted set the student actually matched
  if (question && Array.isArray(question.altAnswer)) {
    correctAnswers = resolveAcceptedAnswers(question, answers);
  }

  var result = new Array(answers.length).fill(false);
  var unordered =
    question.unorderedIndices && question.unorderedIndices.length
      ? question.unorderedIndices
      : [];
  var checked = new Set();

  if (question.stepValidation) {
    question.stepValidation.forEach(function (step) {
      if (!answers) return;
      var vals = answers.slice(step.start, step.end).map(Number);
      var isValid = false;

      if (step.type === "count") {
        isValid = validatePairs(vals, step.rule);
      } else if (step.type === "triples") {
        // Each group of 3 must match one of the allowed triples (any order within group)
        var groupSize = 3;
        var numGroups = step.rule.length;
        var groups = [];
        for (var g = 0; g < numGroups; g++) {
          groups.push(vals.slice(g * groupSize, (g + 1) * groupSize));
        }
        // Each group must match one rule; each rule used at most once
        var usedRules = new Array(step.rule.length).fill(false);
        isValid = groups.every(function (group) {
          return step.rule.some(function (r, ri) {
            if (usedRules[ri]) return false;
            var sortedGroup = [...group].sort((a, b) => a - b);
            var sortedRule = [...r].map(Number).sort((a, b) => a - b);
            if (JSON.stringify(sortedGroup) === JSON.stringify(sortedRule)) {
              usedRules[ri] = true;
              return true;
            }
            return false;
          });
        });
      } else if (step.type === "pairs") {
        var groupSize = step.rule[0].length;
        var numGroups = step.rule.length;
        var groups = [];
        for (var g = 0; g < numGroups; g++) {
          groups.push(vals.slice(g * groupSize, (g + 1) * groupSize));
        }
        isValid = groups.every(function (group) {
          return step.rule.some(function (r) {
            var sortedGroup = [...group].sort((a, b) => a - b);
            var sortedRule = [...r].map(Number).sort((a, b) => a - b);
            return JSON.stringify(sortedGroup) === JSON.stringify(sortedRule);
          });
        });
      } else if (step.type === "anyOrder") {
        var sortedVals = [...vals].map(Number).sort((a, b) => a - b);
        var sortedRule = [...step.rule].map(Number).sort((a, b) => a - b);
        isValid = JSON.stringify(sortedVals) === JSON.stringify(sortedRule);
      }

      for (var j = step.start; j < step.end; j++) {
        result[j] = isValid;
        checked.add(j);
      }
    });
  }

  // Ordered slots: direct comparison
  answers.forEach(function (val, idx) {
    if (unordered.indexOf(idx) === -1 && !checked.has(idx)) {
      result[idx] = compareAnswers(val, correctAnswers[idx]);
    }
  });

  // Unordered slots: check as a set
  if (unordered.length) {
    var givenVals = unordered
      .map(function (idx) {
        return normalizeAnswer(answers[idx]);
      })
      .sort();
    var correctVals = unordered
      .map(function (idx) {
        return normalizeAnswer(correctAnswers[idx]);
      })
      .sort();
    var setMatch = JSON.stringify(givenVals) === JSON.stringify(correctVals);
    unordered.forEach(function (idx) {
      if (!checked.has(idx)) result[idx] = setMatch;
    });
  }

  return result;
}

// ============================================================
// RENDER ANSWER SPAN (colored box for review)
// ============================================================

function renderAnswerSpan(val, correct) {
  var border = correct === null ? "#444" : correct ? "#4CAF50" : "#f44336";
  var color = correct === null ? "#111" : correct ? "#155724" : "#721c24";
  var bg = correct === null ? "#f5f5f5" : correct ? "#d4edda" : "#f8d7da";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;
    min-width:28px;padding:0 5px;height:32px;
    border:2px solid ${border};border-radius:5px;
    background:${bg};color:${color};
    font-weight:bold;font-size:0.95em;vertical-align:middle;margin:0 2px;">
    ${val !== undefined && val !== null && val !== "" ? val : "?"}
  </span>`;
}

// ============================================================
// FORMAT INPUT ANSWERS DISPLAY (inline question + colored boxes)
// ============================================================

function formatInputAnswersDisplay(answers, question, correctAnswers) {
  if (!answers || !Array.isArray(answers)) {
    return "<span style='color:red'>Not Answered</span>";
  }

  var perSlotCorrect = buildPerSlotCorrect(answers, correctAnswers, question);
  var idxRef = { i: 0 };

  function slotCorrect(idx) {
    if (correctAnswers === null || correctAnswers === undefined) return null;
    if (correctAnswers === false) return false;
    if (correctAnswers === true) return null;
    return perSlotCorrect[idx];
  }

  // Short question (1-2 inputs): just show answer boxes
  if (question.input && question.input.length <= 2) {
    var shortHTML = "";
    for (var si = 0; si < answers.length; si++) {
      shortHTML += renderAnswerSpan(answers[si], slotCorrect(si)) + " ";
    }
    return (
      "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:10px;font-size:1.1em;'>" +
      shortHTML +
      "</span>"
    );
  }

  var outHTML = "";

  if (Array.isArray(question.question)) {
    // Start from first "Step" part if present, else render all
    var startIdx = 0;
    question.question.some(function (p, idx) {
      if (typeof p === "string" && /Step\s*\d+:/i.test(p)) {
        startIdx = idx;
        return true;
      }
      return false;
    });
    var renderParts = question.question.slice(startIdx);

    renderParts.forEach(function (part) {
      if (typeof part === "string") {
        // Split on ______ placeholders
        var pieces = part.split("______");
        pieces.forEach(function (piece, pi) {
          if (piece) {
            // Clean <br> to space
            outHTML +=
              "<span style='white-space:pre-wrap;'>" +
              piece.replace(/<br\s*\/?>/gi, " ") +
              "</span>";
          }
          if (pi < pieces.length - 1) {
            outHTML += renderAnswerSpan(
              answers[idxRef.i],
              slotCorrect(idxRef.i),
            );
            idxRef.i++;
          }
        });
      } else if (part.root) {
        if (part.root.value === "______") {
          // Root with blank — show answer inside radical
          var rootColor = "#1a2a4a";
          var indexHTML =
            part.root.index && part.root.index !== 2
              ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${part.root.index}</span>`
              : "";
          outHTML += `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;">
            <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
              ${indexHTML}
              <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
              <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:9px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
                ${renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i))}
              </span>
            </span>
          </span>`;
          idxRef.i++;
        } else {
          outHTML += renderRoot(part.root);
        }
      } else if (part.fraction) {
        // Fraction with possible blank numerator/denominator
        var { numerator, denominator } = part.fraction;
        var numHTML =
          numerator === "______"
            ? renderAnswerSpan(answers[idxRef.i++], slotCorrect(idxRef.i - 1))
            : `<span>${numerator}</span>`;
        var denHTML =
          denominator === "______"
            ? renderAnswerSpan(answers[idxRef.i++], slotCorrect(idxRef.i - 1))
            : `<span>${denominator}</span>`;
        outHTML += `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 3px;">
          <span style="border-bottom:1.5px solid currentColor;padding:0 3px;">${numHTML}</span>
          <span style="padding:0 3px;">${denHTML}</span>
        </span>`;
      }
    });
  } else if (typeof question.question === "string") {
    question.question.split("<br>").forEach(function (brPart) {
      brPart.split("______").forEach(function (p, idx, arr) {
        if (p) outHTML += "<span>" + p + "</span>";
        if (idx < arr.length - 1) {
          outHTML += renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i));
          idxRef.i++;
        }
      });
      outHTML += " ";
    });
  }

  return (
    "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:2px;font-size:0.95em;line-height:1.8;'>" +
    outHTML +
    "</span>"
  );
}

// ============================================================
// DISPLAY RESULTS — with unordered fraction + unorderedIndices scoring
// ============================================================

function displayResults() {
  // Calculate the score based on saved answers
  score = Ansgiven.reduce((total, answer, index) => {
    const q = questions[index];

    // ── ADDED: value-table / table-graph — returns early ──
    if (q.type === "value-table" || q.type === "table-graph") {
      return vtQuestionIsCorrect(q, answer) ? total + 1 : total;
    }

    // ── ADDED: graph (line-sketching) — returns early ──
    if (q.type === "graph") {
      return glGraphIsCorrect(q, answer) ? total + 1 : total;
    }

    if (q.options) {
      return answer === q.answer ? total + 1 : total;
    } else if (q.displayType === "table") {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(answer[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "addition") {
      if (!answer || !Array.isArray(answer)) return total;
      const allCorrect = q.answer.every(
        (correct, idx) =>
          (answer[idx] || "").trim().toLowerCase() ===
          correct.trim().toLowerCase(),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "lcm-division") {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(answer[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "long-division") {
      if (!answer || !answer.values) return total;
      const flat = answer.values.map((v) =>
        typeof v === "object" ? v.value || "" : v,
      );
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(flat[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "tree") {
      if (!answer || answer.type !== "tree") return total;
      const norm = (v) => String(v).toLowerCase().trim();
      const treeCorrect = answer.inputs
        ? answer.inputs.every(
            (inp, idx) => norm(inp.value) === norm(inp.answer),
          )
        : false;
      const hcfCorrect = q.hcf
        ? norm(answer.hcf || "") === norm(q.hcf.answer)
        : true;
      return treeCorrect && hcfCorrect ? total + 1 : total;
    } else if (q.longDivisionSq) {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (ca, idx) => norm(answer[idx] || "") === norm(ca),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.input && Array.isArray(q.input)) {
      // ── Input questions: unorderedFractions, unorderedIndices, or normal ──
      if (!answer || !Array.isArray(answer) || !Array.isArray(q.answer))
        return total;

      let isCorrect = false;

      // any equally valid answer set the student may have written (altAnswer);
      // falls back to q.answer when the question has no alternatives
      const accepted = resolveAcceptedAnswers(q, answer);

      if (q.unorderedFractions) {
        const studentSet = buildRationalSet(answer, q);
        const correctSet = buildRationalSet(accepted, q);
        isCorrect = JSON.stringify(studentSet) === JSON.stringify(correctSet);
      } else if (q.stepValidation) {
        // Step-based flexible checking (prime factorization groups etc.)
        const perSlot = buildPerSlotCorrect(answer, accepted, q);
        isCorrect = perSlot.every((v) => v === true);
      } else if (q.unorderedIndices && q.unorderedIndices.length > 0) {
        const orderedOk = accepted.every((ca, idx) => {
          if (q.unorderedIndices.includes(idx)) return true;
          return (
            (answer[idx] || "").toLowerCase().trim() === ca.toLowerCase().trim()
          );
        });
        const givenU = q.unorderedIndices
          .map((idx) => (answer[idx] || "").toLowerCase().trim())
          .sort();
        const correctU = q.unorderedIndices
          .map((idx) => (accepted[idx] || "").toLowerCase().trim())
          .sort();
        isCorrect =
          orderedOk && JSON.stringify(givenU) === JSON.stringify(correctU);
      } else {
       isCorrect = accepted.every(
  (correctAnswer, idx) => compareAnswers(answer[idx], correctAnswer)
);
      }

      return isCorrect ? total + 1 : total;
    } else if (q.area_model) {
      if (!answer || !Array.isArray(answer)) return total;
      var correctAnswers = flattenAreaModelCorrectAnswers(q.area_model);
      var allCorrect = correctAnswers.every(function (ca, idx) {
        return compareAnswers(answer[idx], ca);
      });
      return allCorrect ? total + 1 : total;
    } else {
      const normalizedAnswer = Array.isArray(answer)
        ? answer.map((a) => String(a).replace(/,/g, "").toLowerCase())
        : answer;
      const normalizedCorrect = Array.isArray(q.answer)
        ? q.answer.map((a) => String(a).replace(/,/g, "").toLowerCase())
        : q.answer;
      return JSON.stringify(normalizedAnswer) ===
        JSON.stringify(normalizedCorrect)
        ? total + 1
        : total;
    }
  }, 0);

  console.log("score", score);

  saveToLocalStorage(topicName + "_score", score);
  saveToLocalStorage(topicName + "_completed", "true");

  const questionBackground = document.getElementById("question_background");
  const question = document.getElementById("question");
  const nextbtn = document.getElementById("nextbtn");
  const result = document.getElementById("result");
  const options = document.getElementById("options");
  const head = document.getElementById("head");

  if (questionBackground) questionBackground.style.display = "none";
  if (question) question.style.display = "none";
  if (nextbtn) nextbtn.style.display = "none";
  if (result) result.style.display = "none";
  if (options) options.style.display = "none";
  if (head) head.innerHTML = "Check Your Answers";

  const element = document.querySelector(".question-content");
  if (element) element.style.display = "flex";
  const element1 = document.querySelector(".question-image-area");
  if (element1) element1.style.display = "block";

  var percentage = Math.round((score / questions.length) * 100);
  var progressBarColor = "";
  var feedbackMessage = "";

  if (percentage <= 40) {
    progressBarColor = "#F28D8D";
    feedbackMessage = "You may need more practice.";
  } else if (percentage > 40 && percentage <= 70) {
    progressBarColor = "#6C8EBF";
    feedbackMessage = "Well done!";
  } else if (percentage > 70) {
    progressBarColor = "#B5E7A0";
    feedbackMessage = "Excellent job!";
  }

  var mainDiv = document.getElementsByClassName("maindiv")[0];
  if (mainDiv) mainDiv.style.display = "flex";

  const picdiv = document.getElementById("picdiv");
  if (picdiv) {
    picdiv.classList.remove("col-md-12", "col-lg-12", "col-sm-12", "col-xs-12");
    picdiv.classList.add("col-md-7", "col-lg-7", "col-sm-7", "col-xs-7");
    picdiv.style.backgroundColor = "#B7A0D0";
    picdiv.style.fontSize = "1.8rem";
    picdiv.style.textAlign = "center";
    picdiv.style.color = "#333";
    picdiv.style.display = "block";
  }

  var Dis =
    "<br><br><br><br><br>Thank you for participating.<br><br>Score: " +
    score +
    "/" +
    questions.length +
    "<br><br>";
  var home =
    "<a href='index.html'><b class='btn btn-success next-btn-progress'>Next</b></a><br>";
  var content =
    Dis +
    feedbackMessage +
    "<br><div class='progress'> <div class='progress-bar' role='progressbar' aria-valuenow='" +
    percentage +
    "' aria-valuemin='0' aria-valuemax='100' style='width:" +
    percentage +
    "%;background-color:" +
    progressBarColor +
    ";'> </div></div>" +
    home;

  saveToLocalStorage(topicName + "_results_content", content);
  if (picdiv) picdiv.innerHTML = content;

  var questionContent = "";
  const questiondiv = document.getElementById("questiondiv");
  if (questiondiv) {
    questiondiv.classList.remove("input");
    questiondiv.style.textAlign = "left";
    questiondiv.style.color = "black";
    questiondiv.style.fontSize = "18px";
    questiondiv.innerHTML = "";
  }

  // Build detailed question review
  for (var j = 0; j < questions.length; j++) {
    var ques = questions[j].question;
    var questionText = "";

    if (Array.isArray(ques)) {
      // Show only parts BEFORE the first blank/input slot
      var reachedBlank = false;
      questionText = ques
        .map((part) => {
          if (reachedBlank) return "";
          if (typeof part === "string") {
            var blankIdx = part.search(
              /(<sup>______<\/sup>|<drop>______<\/drop>|______)/,
            );
            if (blankIdx !== -1) {
              reachedBlank = true;
              return part
                .substring(0, blankIdx)
                .replace(/<br\s*\/?>\s*$/, "")
                .trimEnd();
            }
            return part;
          } else if (part.fraction) {
            const { whole, numerator, denominator } = part.fraction;
            if (
              numerator === "______" ||
              denominator === "______" ||
              whole === "______"
            ) {
              reachedBlank = true;
              return "";
            }
            return formatFractionForDisplay(part);
          } else if (part.root) {
            if (part.root.value === "______") {
              reachedBlank = true;
              return "";
            }
            return renderRoot(part.root);
          }
          return "";
        })
        .join("")
        .replace(/<br\s*\/?>\s*$/, "")
        .replace(/[=:\s]+$/, "")
        .trim();
    } else {
      // String question — show only text before first blank
      var firstBlank = (ques || "").search(
        /(<sup>______<\/sup>|<drop>______<\/drop>|______)/,
      );
      if (firstBlank !== -1) {
        questionText = (ques || "")
          .substring(0, firstBlank)
          .replace(/<br[^>]*>/g, " ")
          .replace(/[=:\s]+$/, "")
          .trim();
      } else {
        questionText = ques || "";
      }
    }

    var correctAnswer = "";
    if (questions[j].options) {
      var correctOption = questions[j].options[questions[j].answer];
      if (correctOption) {
        if (correctOption.image) {
          correctAnswer = `<img src="${correctOption.image}" alt="Correct Answer" style="max-width: 150px; max-height: 100px; border-radius: 5px; border: 2px solid #28a745;">`;
        } else if (correctOption.fraction) {
          correctAnswer = formatFractionForDisplay(correctOption);
        } else if (correctOption.textParts) {
          correctAnswer = formatTextPartsForDisplay(correctOption.textParts);
        } else {
          correctAnswer = correctOption.text || correctOption;
        }
      }
    } else if (questions[j].longDivisionSq) {
      correctAnswer = questions[j].answer ? questions[j].answer.join(", ") : "";
    } else if (questions[j].input && Array.isArray(questions[j].input)) {
      // formatInputAnswersDisplay handles this in the userAnswer/isCorrect block below
      correctAnswer = "";
    } else {
      correctAnswer = Array.isArray(questions[j].answer)
        ? questions[j].answer.join(", ")
        : questions[j].answer;
    }

    var userAnswer = "";
    var isCorrect = false;

    if (Ansgiven[j] !== null && Ansgiven[j] !== undefined) {
      if (questions[j].options) {
        var selectedOption = questions[j].options[Ansgiven[j]];
        if (selectedOption) {
          if (selectedOption.image) {
            var borderColor =
              Ansgiven[j] === questions[j].answer ? "#28a745" : "#dc3545";
            userAnswer = `<img src="${selectedOption.image}" alt="Your Answer" style="max-width: 150px; max-height: 100px; border-radius: 5px; border: 2px solid ${borderColor};">`;
          } else if (selectedOption.fraction) {
            userAnswer = formatFractionForDisplay(selectedOption);
          } else if (selectedOption.textParts) {
            userAnswer = formatTextPartsForDisplay(selectedOption.textParts);
          } else {
            userAnswer = selectedOption.text || selectedOption;
          }
        }
        isCorrect = Ansgiven[j] === questions[j].answer;
      } else if (questions[j].longDivisionSq) {
        var ldAnswers =
          Ansgiven[j] && Array.isArray(Ansgiven[j]) ? Ansgiven[j] : [];
        userAnswer = ldAnswers.join(", ") || "Not answered";
        var normLD = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
        isCorrect =
          Array.isArray(questions[j].answer) &&
          questions[j].answer.every(
            (ca, idx) => normLD(ldAnswers[idx] || "") === normLD(ca),
          );
      } else if (questions[j].input && Array.isArray(questions[j].input)) {
        var correctAnswersArr = questions[j].answer || [];
        var studentAnswersArr =
          Ansgiven[j] && Array.isArray(Ansgiven[j]) ? Ansgiven[j] : [];

        // Build label+box display from question text
      function buildLabelBoxHTML(answersArr, colorFn) {
  var q = questions[j];
  var ansIdx = 0;
  var html = "";
  var tokenRegex = /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;

  function answerBox() {
    var val = answersArr[ansIdx] || "";
    var isBlank = val === "";
    var color = isBlank ? "#888" : colorFn(ansIdx, val);
    ansIdx++;
    return (
      '<span style="display:inline-flex;align-items:center;justify-content:center;' +
      "min-width:50px;height:30px;padding:0 8px;margin:0 2px;" +
      "border:2px solid " + (isBlank ? "#ccc" : color) + ";" +
      "border-radius:6px;background:" + (isBlank ? "#f5f5f5" : color + "22") + ";" +
      "color:" + (isBlank ? "#888" : color) +
      ';font-weight:bold;font-size:1em;">' +
      (isBlank ? "?" : val) +
      "</span>"
    );
  }

  function answerSupBox() {
    var val = answersArr[ansIdx] || "";
    var isBlank = val === "";
    var color = isBlank ? "#888" : colorFn(ansIdx, val);
    ansIdx++;
    return (
      '<span style="display:inline-flex;align-items:center;justify-content:center;' +
      "min-width:24px;height:24px;padding:0 4px;margin:0 2px;position:relative;top:-10px;" +
      "border:2px solid " + (isBlank ? "#ccc" : color) + ";" +
      "border-radius:5px;background:" + (isBlank ? "#f5f5f5" : color + "22") + ";" +
      "color:" + (isBlank ? "#888" : color) +
      ';font-weight:bold;font-size:0.75em;">' +
      (isBlank ? "?" : val) +
      "</span>"
    );
  }

function numeratorHTML(numerator) {
    if (Array.isArray(numerator)) {
      return numerator
        .map(function (item) {
          if (item === "______") {
            return answerBox();
          } else if (item && typeof item === "object" && "sup" in item) {
            return item.sup === "______" ? answerSupBox() : "<sup>" + item.sup + "</sup>";
          } else {
            return '<span style="font-weight:bold;font-size:0.9em;"> ' + item + " </span>";
          }
        })
        .join("");
    }
    return numerator === "______" ? answerBox() : numerator;
  }

  function fracHTML(frac) {
    var num = numeratorHTML(frac.numerator);
    var den = frac.denominator === "______" ? answerBox() : frac.denominator;
    var whole = "";
    if (frac.whole) {
      whole = frac.whole === "______" ? answerBox() : '<span style="margin-right:2px;">' + frac.whole + "</span>";
    }
    return (
      whole +
      '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 4px;font-size:0.9em;">' +
      '<span style="border-bottom:2px solid #333;padding:0 4px;">' + num + "</span>" +
      '<span style="padding:0 4px;">' + den + "</span>" +
      "</span>"
    );
  }
  function renderTokens(str) {
    var out = "";
    str.split(tokenRegex).forEach(function (piece) {
      if (piece === "<sup>______</sup>") {
        out += answerSupBox();
      } else if (piece === "<drop>______</drop>" || piece === "______") {
        out += answerBox();
      } else {
        var clean = piece.replace(/<br\s*\/?>/gi, " ").trim();
        if (clean) out += '<span style="font-size:0.9em;color:#333;">' + clean + "</span>";
      }
    });
    return out;
  }

  if (Array.isArray(q.question)) {
    html += '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px;margin:4px 0;">';
    q.question.forEach(function (part) {
      if (typeof part === "string") {
        html += renderTokens(part);
      } else if (part.fraction) {
        html += fracHTML(part.fraction);
      }
    });
    html += "</div>";
  } else {
    var qText = typeof q.question === "string" ? q.question : "";
    qText.split("<br>").forEach(function (line) {
      if (line.indexOf("______") === -1) return;
      html += '<div style="display:flex;align-items:center;gap:4px;margin:4px 0;flex-wrap:wrap;">' + renderTokens(line) + "</div>";
    });
  }

  return html || '<span style="color:#888">—</span>';
}

        var hasAnyAnswer = studentAnswersArr.some(function (v) {
          return v && v.trim() !== "";
        });

        // mark against whichever accepted set the student matched, so an
        // altAnswer (6/8 instead of 3/4) colours green rather than red
        var acceptedArr = resolveAcceptedAnswers(
          questions[j],
          studentAnswersArr,
        );

       userAnswer = hasAnyAnswer
  ? buildLabelBoxHTML(studentAnswersArr, function (idx, val) {
      return compareAnswers(val, acceptedArr[idx]) ? "#28a745" : "#dc3545";
    })
  : "<span style='color:#dc3545'>Not answered</span>";

        correctAnswer = buildLabelBoxHTML(correctAnswersArr, function () {
          return "#28a745";
        });
        // show every equally acceptable answer under the main one, as "or ..."
        if (Array.isArray(questions[j].altAnswer)) {
          questions[j].altAnswer.forEach(function (alt) {
            correctAnswer +=
              "<div style='display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:6px;'>" +
              "<span style='font-style:italic;color:#555;'>or</span>" +
              buildLabelBoxHTML(alt, function () {
                return "#28a745";
              }) +
              "</div>";
          });
        }
        // Determine correctness
        const q = questions[j];
        const answer = Ansgiven[j];
        const accepted = resolveAcceptedAnswers(q, answer);
        if (!answer || !Array.isArray(answer) || !Array.isArray(q.answer)) {
          isCorrect = false;
        } else if (q.unorderedFractions) {
          isCorrect =
            JSON.stringify(buildRationalSet(answer, q)) ===
            JSON.stringify(buildRationalSet(accepted, q));
        } else if (q.stepValidation) {
          const perSlot = buildPerSlotCorrect(answer, accepted, q);
          isCorrect = perSlot.every((v) => v === true);
        } else if (q.unorderedIndices && q.unorderedIndices.length > 0) {
          const orderedOk = accepted.every((ca, idx) => {
            if (q.unorderedIndices.includes(idx)) return true;
            return (
              (answer[idx] || "").toLowerCase().trim() ===
              ca.toLowerCase().trim()
            );
          });
          const givenU = q.unorderedIndices
            .map((idx) => (answer[idx] || "").toLowerCase().trim())
            .sort();
          const correctU = q.unorderedIndices
            .map((idx) => (accepted[idx] || "").toLowerCase().trim())
            .sort();
          isCorrect =
            orderedOk && JSON.stringify(givenU) === JSON.stringify(correctU);
       } else {
  isCorrect =
    Array.isArray(answer) &&
    accepted.every((ca, idx) => compareAnswers(answer[idx], ca));
}
      } else {
        userAnswer = Array.isArray(Ansgiven[j])
          ? Ansgiven[j].join(", ")
          : Ansgiven[j];
        isCorrect =
          JSON.stringify(Ansgiven[j]) === JSON.stringify(questions[j].answer);
      }
    } else {
      userAnswer = "<span style='color:#dc3545'>Not answered</span>";
      if (questions[j].input && Array.isArray(questions[j].input)) {
        // Build correct answer display — handles both string and array questions
       var correctAnswersArr2 = questions[j].answer || [];
        var ansIdx2 = 0;
        var correctBoxHTML = "";
        var tokenRegex2 = /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;

        function correctBox2() {
          var val = correctAnswersArr2[ansIdx2] || "";
          ansIdx2++;
          return (
            '<span style="display:inline-flex;align-items:center;justify-content:center;' +
            "min-width:50px;height:30px;padding:0 8px;margin:0 2px;" +
            "border:2px solid #28a745;border-radius:6px;" +
            'background:#28a74522;color:#28a745;font-weight:bold;font-size:1em;">' +
            val + "</span>"
          );
        }

        function correctSupBox2() {
          var val = correctAnswersArr2[ansIdx2] || "";
          ansIdx2++;
          return (
            '<span style="display:inline-flex;align-items:center;justify-content:center;' +
            "min-width:24px;height:24px;padding:0 4px;margin:0 2px;position:relative;top:-10px;" +
            "border:2px solid #28a745;border-radius:5px;" +
            'background:#28a74522;color:#28a745;font-weight:bold;font-size:0.75em;">' +
            val + "</span>"
          );
        }

        function renderCorrectTokens(str) {
          var out = "";
          str.split(tokenRegex2).forEach(function (piece) {
            if (piece === "<sup>______</sup>") {
              out += correctSupBox2();
            } else if (piece === "<drop>______</drop>" || piece === "______") {
              out += correctBox2();
            } else {
              var clean = piece.replace(/<br\s*\/?>/gi, " ").trim();
              if (clean) out += '<span style="font-size:0.9em;color:#333;">' + clean + "</span>";
            }
          });
          return out;
        }

        if (Array.isArray(questions[j].question)) {
          correctBoxHTML +=
            '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px;margin:4px 0;">';
          questions[j].question.forEach(function (part) {
            if (typeof part === "string") {
              correctBoxHTML += renderCorrectTokens(part);
            } else if (part.fraction) {
              var f = part.fraction;
              var num;
              if (Array.isArray(f.numerator)) {
                num = f.numerator
                  .map(function (item) {
                    if (item === "______") {
                      return correctBox2();
                    } else if (item && typeof item === "object" && "sup" in item) {
                      return item.sup === "______" ? correctSupBox2() : "<sup>" + item.sup + "</sup>";
                    } else {
                      return '<span style="font-weight:bold;font-size:0.9em;"> ' + item + " </span>";
                    }
                  })
                  .join("");
              } else {
                num = f.numerator === "______" ? correctBox2() : f.numerator;
              }
              var den = f.denominator === "______" ? correctBox2() : f.denominator;
              var wh = f.whole
                ? f.whole === "______"
                  ? correctBox2()
                  : '<span style="margin-right:2px;">' + f.whole + "</span>"
                : "";
              correctBoxHTML +=
                wh +
                '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 4px;font-size:0.9em;">' +
                '<span style="border-bottom:2px solid #28a745;padding:0 4px;">' +
                num +
                "</span>" +
                '<span style="padding:0 4px;">' +
                den +
                "</span></span>";
            }
          });
          correctBoxHTML += "</div>";
        } else {
          var qText2 =
            typeof questions[j].question === "string"
              ? questions[j].question
              : "";
          var lines2 = qText2.split("<br>");
          lines2.forEach(function (line) {
            if (line.indexOf("______") === -1) return;
            correctBoxHTML +=
              '<div style="display:flex;align-items:center;gap:4px;margin:4px 0;flex-wrap:wrap;">' +
              renderCorrectTokens(line) +
              "</div>";
          });
        }

        correctAnswer =
          correctBoxHTML ||
          '<span style="color:#28a745;font-weight:bold;">' +
            correctAnswersArr2.join(" , ") +
            "</span>";      }
    }

    var answerColor = isCorrect ? "#28a745" : "#dc3545";

    // ── TABLE question review ──
    if (questions[j].longDivisionSq) {
      // ── LONG DIVISION SQUARE ROOT review — full grid layout ──
      var ldStudentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentLdGrid = buildLongDivisionSqReviewHTML(
        questions[j],
        ldStudentAnswers,
        "student",
      );
      var correctLdGrid = buildLongDivisionSqReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          <div style="display:flex;flex-direction:row;flex-wrap:nowrap;gap:10px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="flex:1;min-width:0;text-align:center;">
              <div style="font-weight:bold;margin-bottom:4px;color:#555;font-size:12px;">Correct Answer</div>
              ${correctLdGrid}
            </div>
            <div style="flex:1;min-width:0;text-align:center;">
              <div style="font-weight:bold;margin-bottom:4px;color:#555;font-size:12px;">Your Answer</div>
              ${studentLdGrid}
            </div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;
    } else if (questions[j].displayType === "table") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentTable = buildTableHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctTable = buildTableHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>
              <div style="font-size:0.82em;">${correctTable}</div>
            </div>
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>
              <div style="font-size:0.82em;">${studentTable}</div>
            </div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── ADDITION question review ──
    } else if (questions[j].type === "addition") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentGrid = buildAdditionGridHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctGrid = buildAdditionGridHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:nowrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctGrid}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentGrid}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── LCM-DIVISION question review ──
    } else if (questions[j].type === "lcm-division") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentLCM = buildLCMReviewHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctLCM = buildLCMReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctLCM}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentLCM}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── LONG-DIVISION question review ──
    } else if (questions[j].type === "long-division") {
      var savedLD = Ansgiven[j];
      var studentValuesLD = [];
      if (savedLD && savedLD.values) {
        studentValuesLD = savedLD.values.map((v) =>
          typeof v === "object" ? v.value || "" : v,
        );
      } else {
        studentValuesLD = new Array(questions[j].answer.length).fill("");
      }

      var studentLD = buildLongDivisionReviewHTML(
        questions[j],
        studentValuesLD,
        "student",
      );
      var correctLD = buildLongDivisionReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctLD}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentLD}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── TREE question review ──
    } else if (questions[j].type === "tree") {
      var savedAns = Ansgiven[j];
      var studentTree = buildTreeReviewHTML(questions[j], savedAns, "student");
      var correctTree = buildTreeReviewHTML(questions[j], savedAns, "correct");

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctTree}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentTree}</div>
          </div>
        </div>
      `;

      // ── VALUE-TABLE / TABLE-GRAPH question review ──
    } else if (
      questions[j].type === "value-table" ||
      questions[j].type === "table-graph"
    ) {
      var vtGiven = Ansgiven[j];
      var vtCorrectHTML = vtBuildResultHTML(questions[j], null, false);
      var vtStudentHTML = vtGiven
        ? vtBuildResultHTML(questions[j], vtGiven, true)
        : "<span style='color:red'>Not Answered</span>";

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;min-width:0;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${vtCorrectHTML}</div>
            <div style="text-align:center;flex:1;min-width:0;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${vtStudentHTML}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── GRAPH (line-sketching) question review ──
    } else if (questions[j].type === "graph") {
      var glGiven = Ansgiven[j];
      var glCorrectHTML = glBuildResultHTML(questions[j], null, false);
      var glStudentHTML =
        glGiven && glGiven.points && glGiven.points.length
          ? glBuildResultHTML(questions[j], glGiven, true)
          : "<span style='color:red'>Not Answered</span>";

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;min-width:0;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${glCorrectHTML}</div>
            <div style="text-align:center;flex:1;min-width:0;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${glStudentHTML}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── AREA MODEL question review ──
    } else if (questions[j].area_model) {
      var amCorrectAnswers = flattenAreaModelCorrectAnswers(
        questions[j].area_model,
      );
      var amStudentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(amCorrectAnswers.length).fill("");
      var amCorrectHTML = buildAreaModelResultHTML(
        questions[j],
        amCorrectAnswers,
        amCorrectAnswers,
        false,
      );
      var amStudentHTML = buildAreaModelResultHTML(
        questions[j],
        amStudentAnswers,
        amCorrectAnswers,
        true,
      );
      var amAllCorrect = amCorrectAnswers.every(function (ca, idx) {
        return compareAnswers(amStudentAnswers[idx], ca);
      });

      questionContent += `
        <div class="question-review" style="padding:10px;margin-bottom:12px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:8px;font-size:0.95em;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:6px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:200px;max-height:150px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;">
            <div>
              <div style="font-weight:bold;margin-bottom:4px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Correct Answer</div>
              <div style="overflow-x:auto;">${amCorrectHTML}</div>
            </div>
            <div>
              <div style="font-weight:bold;margin-bottom:4px;color:${amAllCorrect ? "#28a745" : "#dc3545"};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Your Answer ${amAllCorrect ? "✓" : "✗"}</div>
              <div style="overflow-x:auto;">${amStudentHTML}</div>
            </div>
          </div>
        </div>
      `;

      // ── ALL OTHER QUESTIONS ──
    } else {
      questionContent += `
        <div class="question-review" style="padding: 15px; margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin: 10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width: 300px; max-height: 200px; border-radius: 5px;"></div>` : ""}
          <div style="margin: 8px 0;">
            <strong>Your Answer:</strong>
            ${userAnswer.includes("<img") ? userAnswer : `<span style="color: ${answerColor};">${userAnswer}</span>`}
          </div>
          <div style="margin: 8px 0;">
            <strong>Correct Answer:</strong>
            ${correctAnswer.includes("<img") || correctAnswer.includes("<span") ? correctAnswer : `<span style="color: #28a745;">${correctAnswer}</span>`}
          </div>
          ${questions[j].explanation ? `<div style="margin: 8px 0; font-style: italic; color: #666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;
    }
  }

  saveToLocalStorage(topicName + "_question_content", questionContent);

  // ── Split into two pages for PDF if topic has longDivisionSq + long input questions ──
  var hasLongDivSq = questions.some(function (q) {
    return q.longDivisionSq;
  });
  var hasLongInput = questions.some(function (q) {
    return (
      q.input &&
      Array.isArray(q.input) &&
      q.input.length >= 6 &&
      !q.longDivisionSq
    );
  });

  if (hasLongDivSq && hasLongInput) {
    // Split: longDivisionSq questions go to page 2, rest to page 1
    var page1 = "";
    var page2 = "";
    var reviewDivs = questionContent.match(
      /<div class="question-review"[\s\S]*?<\/div>\s*\n?\s*`?/g,
    );

    // Rebuild by iterating questions in order
    var qIdx = 0;
    var tempContent = questionContent;
    // Simple split: first half of questions on page 1, longDivisionSq questions on page 2
    questions.forEach(function (q, idx) {
      if (q.longDivisionSq) {
        // These go to page 2 — already in questionContent, we'll split by question number
      }
    });

    // Split at the first longDivisionSq question
    var splitQNo = -1;
    for (var qi = 0; qi < questions.length; qi++) {
      if (questions[qi].longDivisionSq) {
        splitQNo = qi;
        break;
      }
    }

    if (splitQNo > 0) {
      // Find the split point in questionContent by looking for "Question N:"
      var splitMarker = "Question " + (splitQNo + 1) + ":";
      var splitIdx = questionContent.indexOf(splitMarker);
      if (splitIdx !== -1) {
        // Find the start of the div containing this question
        var divStart = questionContent.lastIndexOf(
          '<div class="question-review"',
          splitIdx,
        );
        if (divStart !== -1) {
          page1 = questionContent.substring(0, divStart);
          page2 = questionContent.substring(divStart);
          saveToLocalStorage(topicName + "_question_content_p2", page2);
          saveToLocalStorage(topicName + "_question_content", page1);
        }
      }
    }
  } else {
    // Remove any stale page 2
    saveToLocalStorage(topicName + "_question_content_p2", null);
  }

  if (questiondiv) {
    if (picdiv) picdiv.innerHTML = content;
    questiondiv.innerHTML = questionContent + home;
  }

  updateButtonStyles();

  var buttons = document.querySelectorAll(".btnButton");
  buttons.forEach((button) => {
    button.classList.add("disabled-btn");
    button.disabled = true;
  });
}

function checkAnswer() {
  submitSound.play();
  saveCurrentAnswer();

  saveToLocalStorage("currentQuestionIndex", i);

  document.getElementById("subbtn").style.display = "none";
  document.getElementById("nextbtn").style.display = "inline-block";

  updateButtonStyles();
}

function abc(x) {
  saveCurrentAnswer();
  i = x - 1;
  saveToLocalStorage("currentQuestionIndex", i);
  loadQuestion(i);
  var resultEl = document.getElementById("result");
  if (resultEl) resultEl.innerHTML = "";
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";

  highlightButton(i);
  updateButtonStyles();
}

var isSubmitted = false;

// ── UPDATED: checks live inputs (from File 2) ──
function updateButtonVisibility() {
  var currentQuestion = questions[i];
  var hasAnswer = false;

  if (
    currentQuestion.area_model ||
    (currentQuestion.input && Array.isArray(currentQuestion.input)) ||
    (currentQuestion.displayType === "table" && currentQuestion.tableStructure)
  ) {
    var inputs = document.querySelectorAll(".answer-input");
    inputs.forEach(function (input) {
      if (input.value.trim() !== "") hasAnswer = true;
    });
  } else {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    hasAnswer = selectedAnswer !== null;
  }

  var submitButton = document.getElementById("subbtn");
  var nextButton = document.getElementById("nextbtn");

  if (hasAnswer) {
    submitButton.style.display = "inline-block";
    nextButton.style.display = "none";
  } else {
    submitButton.style.display = "none";
    nextButton.style.display = "none";
  }
}

function highlightButton(index) {
  var buttonContainer = document.getElementById("buttonContainer");
  var buttons = buttonContainer.getElementsByTagName("button");

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove("highlighted-btn");
  }

  if (index >= 0 && index < buttons.length) {
    buttons[index].classList.add("highlighted-btn");
  }
}

// ── UPDATED: adds unanswered-btn yellow class (from File 2) ──
function updateButtonStyles() {
  var buttonContainer = document.getElementById("buttonContainer");
  if (!buttonContainer) return;

  var buttons = buttonContainer.getElementsByTagName("button");

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove("answered-btn", "unanswered-btn");
  }

  for (var j = 0; j < buttons.length; j++) {
    var hasValidAnswer = false;
    var answer = Ansgiven[j];

    if (Array.isArray(answer)) {
      hasValidAnswer = answer.some((val) => val && val.trim() !== "");
    } else {
      hasValidAnswer = answer !== null && answer !== undefined;
    }

    if (j === i) {
      // current question — default styling, no class
    } else if (hasValidAnswer) {
      buttons[j].classList.add("answered-btn"); // green
    } else {
      buttons[j].classList.add("unanswered-btn"); // yellow
    }
  }
}

function updateButtonText() {
  var nextButton = document.getElementById("nextbtn");
  if (i === count - 1) {
    nextButton.innerHTML = "FINISH TEST";
    nextButton.onclick = function () {
      newques();
    };
  } else {
    nextButton.innerHTML = "Next";
  }
}

// ============================================================
// LCM DIVISION
// ============================================================

function renderLCMDivision(question, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");

  optionsElement.style.display = "flex";
  optionsElement.style.justifyContent = "center";
  optionsElement.style.alignItems = "center";

  const container = document.createElement("div");
  container.className = "lcm-container";

  const numCount = question.numbers.length;
  container.style.setProperty("--num-cols", numCount);
  question.numbers.forEach((num) => {
    const cell = document.createElement("div");
    cell.className = "lcm-cell";
    cell.textContent = num;
  });

  let inputIndex = 0;

  question.steps.forEach((step, stepIndex) => {
    const row = document.createElement("div");
    row.className = "lcm-row";

    if (stepIndex === question.steps.length - 1) {
      row.style.borderBottom = "none";
    }

    const divisorCell = document.createElement("div");
    divisorCell.className = "lcm-divisor";

    if (step.divisor === "_") {
      divisorCell.appendChild(createLCMInput(index, inputIndex++));
    } else if (step.divisor !== null) {
      divisorCell.textContent = step.divisor;
    }

    row.appendChild(divisorCell);

    step.values.forEach((val) => {
      const cell = document.createElement("div");
      cell.className = "lcm-cell";

      if (val === "_") {
        cell.appendChild(createLCMInput(index, inputIndex++));
      } else {
        cell.textContent = val;
      }

      row.appendChild(cell);
    });

    container.appendChild(row);
  });

  if ("lcm" in question) {
    const resultRow = document.createElement("div");
    resultRow.className = "lcm-result";
    const label = question.resultLabel || "HCF";
    resultRow.innerHTML = `<strong>${label} = </strong>`;
    resultRow.appendChild(createLCMInput(index, inputIndex++));
    container.appendChild(resultRow);
  }

  if (Array.isArray(question["Prime factorization"])) {
    const pfWrapper = document.createElement("div");
    pfWrapper.className = "prime-factorization";

    const label = document.createElement("strong");
    label.innerText = "Prime factorization: ";
    pfWrapper.appendChild(label);

    let pfInputIndex = container.querySelectorAll(".lcm-input").length;

    question["Prime factorization"].forEach((item, idx) => {
      if (item === "_") {
        pfWrapper.appendChild(createLCMInput(index, pfInputIndex++));
      } else {
        const span = document.createElement("span");
        span.innerText = item;
        pfWrapper.appendChild(span);
      }

      if (idx > 0 && idx < question["Prime factorization"].length - 1) {
        pfWrapper.appendChild(document.createTextNode(" × "));
      }
    });

    container.appendChild(document.createElement("hr"));
    container.appendChild(pfWrapper);
  }

  optionsElement.appendChild(container);
  restoreLCMAnswers(index);
}

function createLCMInput(qIndex, ansIndex) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "answer-input lcm-input";
  input.dataset.q = qIndex;
  input.dataset.a = ansIndex;

  input.addEventListener("input", () => {
    handleLCMInputChange(qIndex);
  });

  return input;
}

function handleLCMInputChange(qIndex) {
  const inputs = document.querySelectorAll(".lcm-input");
  const values = [];
  inputs.forEach((inp) => values.push(inp.value.trim()));
  Ansgiven[qIndex] = values;

  saveToLocalStorage("Ansgiven", Ansgiven);

  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreLCMAnswers(index) {
  if (!Ansgiven[index]) return;

  const inputs = document.querySelectorAll(".lcm-input");
  inputs.forEach((inp, i) => {
    if (Ansgiven[index][i] !== undefined) {
      inp.value = Ansgiven[index][i];
    }
  });
}

// ============================================================
// LONG DIVISION
// ============================================================

var treeInputs = [];
var renderedTreeRoot = [];

function renderLongDivision(q, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");

  const container = document.createElement("div");
  container.className = "long-division-container";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.width = "100%";

  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const id = inputIndex++;
      return `<input 
        type="text"
        class="answer-input long-div-input"
        data-q="${index}"
        data-a="${id}"
        style="width:60px;height:38px;font-size:0.8em;text-align:center;
               border:2px solid #667eea;border-radius:4px;font-weight:bold;" />`;
    }
    if (val === undefined || val === null) return "";
    return `<span style="font-size:1em;font-weight:bold;display:inline-flex;
                         align-items:center;justify-content:center;min-width:60px;">${val}</span>`;
  }

  const steps = q.steps;
  const N = steps.length;

  const R = steps.map((s, i) => {
    let divisor = s.divisor;
    let dividend = s.dividend;
    if (i > 0) {
      if (divisor === undefined) divisor = steps[i - 1].remainder;
      if (dividend === undefined) dividend = steps[i - 1].divisor;
    }
    return { ...s, divisor, dividend };
  });

  const totalRows = N * 2 + 2;
  const totalCols = N * 2 + 4;

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => ({ content: "", style: "" })),
  );

  for (let i = 0; i < N; i++) {
    const s = R[i];
    const baseRow = i * 2;
    const divCol = i * 2;
    const brkLCol = i * 2 + 1;
    const dvdCol = i * 2 + 2;
    const brkRCol = i * 2 + 3;

    grid[baseRow][dvdCol] = {
      content: makeCell(s.quotient),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:60px;",
    };

    if (i === 0) {
      grid[baseRow + 1][divCol] = {
        content: makeCell(s.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
    }
    grid[baseRow + 1][brkLCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">)</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };
    grid[baseRow + 1][dvdCol] = {
      content: makeCell(s.dividend),
      style:
        "text-align:center;border-top:3px solid black;padding:6px 8px;vertical-align:middle;min-width:60px;",
    };
    grid[baseRow + 1][brkRCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">(</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 2][brkLCol] = {
      content: `<span style="font-size:1em;font-weight:bold;">−</span>`,
      style: "text-align:right;vertical-align:middle;padding-right:2px;",
    };
    grid[baseRow + 2][dvdCol] = {
      content: makeCell(s.subtract),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:60px;",
    };

    grid[baseRow + 3][dvdCol] = {
      content: makeCell(s.remainder),
      style:
        "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
    };
  }

  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:center;margin:10px 0;">`;
  html += `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:1.4em;">`;

  for (let r = 0; r < totalRows; r++) {
    const rowHasContent = grid[r].some((c) => c.content !== "");
    if (!rowHasContent) continue;
    html += `<tr>`;
    for (let c = 0; c < totalCols; c++) {
      const cell = grid[r][c];
      html += `<td style="padding:0;${cell.style}">${cell.content}</td>`;
    }
    html += `</tr>`;
  }

  html += `</table></div>`;

  if (q.hcf !== undefined || q.gcf !== undefined) {
    const label = q.gcf !== undefined ? "GCF" : "HCF";
    html += `
      <div style="text-align:center;font-size:1.3em;font-weight:bold;margin-top:20px;">
        ${label} = 
        <input 
          type="text"
          class="answer-input long-div-input hcf-input"
          data-q="${index}"
          data-a="hcf"
          style="width:80px;height:38px;font-size:0.8em;margin-left:8px;text-align:center;" />
      </div>`;
  }

  container.innerHTML = html;
  optionsElement.appendChild(container);

  restoreLongDivisionAnswers(index);

  const inputs = container.querySelectorAll(".long-div-input");
  inputs.forEach((input) => {
    input.addEventListener("input", () => handleLongDivisionInputChange(index));
  });
}

function handleLongDivisionInputChange(qIndex) {
  const inputs = Array.from(document.querySelectorAll(".long-div-input"));

  inputs.sort((a, b) => {
    if (a.dataset.a === "hcf") return 1;
    if (b.dataset.a === "hcf") return -1;
    return parseInt(a.dataset.a, 10) - parseInt(b.dataset.a, 10);
  });

  const values = [];
  inputs.forEach((inp) => {
    if (inp.classList.contains("hcf-input")) {
      values.push({ type: "hcf", value: inp.value.trim() });
    } else {
      values.push(inp.value.trim());
    }
  });

  Ansgiven[qIndex] = {
    type: "long-division",
    values: values,
    image: null,
  };

  saveToLocalStorage("Ansgiven", Ansgiven);
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreLongDivisionAnswers(index) {
  if (!Ansgiven[index]) return;

  const saved = Ansgiven[index];
  const values = saved.type === "long-division" ? saved.values : saved;
  if (!Array.isArray(values)) return;

  const inputs = Array.from(document.querySelectorAll(".long-div-input"));

  inputs.forEach((inp) => {
    if (inp.classList.contains("hcf-input")) {
      const hcfData = values.find((item) => item && item.type === "hcf");
      if (hcfData) inp.value = hcfData.value;
    } else {
      const logicIndex = parseInt(inp.dataset.a, 10);
      if (!isNaN(logicIndex) && values[logicIndex] !== undefined) {
        const val =
          typeof values[logicIndex] === "object"
            ? values[logicIndex].value
            : values[logicIndex];
        inp.value = val || "";
      }
    }
  });
}

function buildLongDivisionReviewHTML(question, resultValues, mode) {
  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<span style="
        display:inline-flex;align-items:center;justify-content:center;
        min-width:44px;height:38px;background:${bg};color:${color};
        border-radius:6px;font-weight:bold;font-size:1em;padding:0 6px;
      ">${display}</span>`;
    }
    if (val === undefined || val === null) return "";
    return `<span style="font-size:1em;font-weight:bold;display:inline-flex;
                         align-items:center;justify-content:center;min-width:44px;">${val}</span>`;
  }

  const steps = question.steps;
  const N = steps.length;
  const totalRows = N * 2 + 2;
  const totalCols = N * 2 + 4;

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => ({ content: "", style: "" })),
  );

  for (let i = 0; i < N; i++) {
    const s = steps[i];
    const baseRow = i * 2;
    const divCol = i * 2;
    const brkLCol = i * 2 + 1;
    const dvdCol = i * 2 + 2;
    const brkRCol = i * 2 + 3;

    grid[baseRow][dvdCol] = {
      content: makeCell(s.quotient),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:44px;",
    };

    if (i === 0) {
      grid[baseRow + 1][divCol] = {
        content: makeCell(s.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
    }

    grid[baseRow + 1][brkLCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">)</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 1][dvdCol] = {
      content: makeCell(s.dividend),
      style:
        "text-align:center;border-top:3px solid black;padding:6px 8px;vertical-align:middle;min-width:44px;",
    };

    grid[baseRow + 1][brkRCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">(</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 2][brkLCol] = {
      content: `<span style="font-size:1em;font-weight:bold;">−</span>`,
      style: "text-align:right;vertical-align:middle;padding-right:2px;",
    };
    grid[baseRow + 2][dvdCol] = {
      content: makeCell(s.subtract),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:44px;",
    };

    const nextStep = steps[i + 1];
    if (nextStep && nextStep.divisor === "_") {
      grid[baseRow + 3][divCol] = {
        content: makeCell(nextStep.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
      grid[baseRow + 3][dvdCol] = {
        content: makeCell(s.remainder),
        style:
          "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
      };
    } else {
      grid[baseRow + 3][dvdCol] = {
        content: makeCell(s.remainder),
        style:
          "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
      };
    }
  }

  let html = `<div style="display:flex;justify-content:center;align-items:center;margin:10px 0;overflow-x:auto;">`;
  html += `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:1.1em;">`;

  for (let r = 0; r < totalRows; r++) {
    const rowHasContent = grid[r].some((c) => c.content !== "");
    if (!rowHasContent) continue;
    html += `<tr>`;
    for (let c = 0; c < totalCols; c++) {
      const cell = grid[r][c];
      html += `<td style="padding:0;${cell.style}">${cell.content}</td>`;
    }
    html += `</tr>`;
  }

  html += `</table></div>`;

  if (question.hcf !== undefined) {
    const filled = (resultValues[inputIndex] || "").trim();
    const correct = (question.answer[inputIndex] || "").trim();
    const isRight = filled.toLowerCase() === correct.toLowerCase();
    const display = mode === "correct" ? correct : filled || "?";
    const bg = mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

    html += `
      <div style="text-align:center;font-size:1.2em;font-weight:bold;margin-top:14px;">
        HCF = 
        <span style="display:inline-flex;align-items:center;justify-content:center;
                     min-width:60px;height:38px;background:${bg};color:${color};
                     border-radius:6px;font-weight:bold;padding:0 10px;margin-left:8px;">
          ${display}
        </span>
      </div>`;
  }

  return html;
}

// ============================================================
// TREE QUESTION
// ============================================================

function buildTreeReviewHTML(question, savedAnswer, mode) {
  function collectBlanks(node, result = []) {
    if (node.value === "" || node.value === "_" || node.value == null) {
      result.push({ answer: node.answer });
    }
    if (node.children) node.children.forEach((c) => collectBlanks(c, result));
    return result;
  }

  function buildSVGTree(treeData, answerValues) {
    const levelGap = 80;
    const nodeRadius = 22;
    const nodes = [];
    const links = [];
    let xCounter = 0;
    let ansIdx = 0;

    function layout(node, depth = 0) {
      const isBlank =
        node.value === "" || node.value === "_" || node.value == null;

      let display, bg, borderColor, textColor;

      if (isBlank) {
        const filled = (answerValues[ansIdx] || "").trim();
        const correct = (node.answer || "").trim();
        const isRight = filled.toLowerCase() === correct.toLowerCase();
        display = mode === "correct" ? correct : filled || "?";
        bg = mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        textColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
        borderColor =
          mode === "correct" ? "#28a745" : isRight ? "#28a745" : "#dc3545";
        ansIdx++;
      } else {
        display = node.value;
        bg = "#f5f5f5";
        textColor = "#333";
        borderColor = "#333";
      }

      const current = {
        display,
        bg,
        textColor,
        borderColor,
        depth,
        children: [],
        x: 0,
        y: depth * levelGap + nodeRadius + 10,
      };

      nodes.push(current);

      if (!node.children || node.children.length === 0) {
        current.x = xCounter * 70 + 40;
        xCounter++;
      } else {
        const childXs = [];
        node.children.forEach((child) => {
          const childNode = layout(child, depth + 1);
          current.children.push(childNode);
          links.push({ parent: current, child: childNode });
          childXs.push(childNode.x);
        });
        current.x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
      }

      return current;
    }

    layout(treeData);

    const svgWidth = Math.max(...nodes.map((n) => n.x)) + 60;
    const svgHeight = Math.max(...nodes.map((n) => n.y)) + nodeRadius + 20;

    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" 
                    width="${svgWidth}" height="${svgHeight}"
                    xmlns="http://www.w3.org/2000/svg">`;

    links.forEach((link) => {
      svg += `<line 
        x1="${link.parent.x}" y1="${link.parent.y + nodeRadius}"
        x2="${link.child.x}"  y2="${link.child.y - nodeRadius}"
        stroke="#333" stroke-width="2"/>`;
    });

    nodes.forEach((node) => {
      svg += `
        <circle cx="${node.x}" cy="${node.y}" r="${nodeRadius}"
          fill="${node.bg}" stroke="${node.borderColor}" stroke-width="2"/>
        <text x="${node.x}" y="${node.y + 5}"
          text-anchor="middle" font-size="13" font-weight="bold"
          fill="${node.textColor}">${node.display}</text>
      `;
    });

    svg += `</svg>`;
    return svg;
  }

  const trees = question.trees
    ? question.trees.map((t) => t.tree)
    : [question.tree];

  let allAnswerValues = [];
  if (mode === "correct") {
    allAnswerValues = question.answer || [];
  } else {
    if (savedAnswer && savedAnswer.inputs) {
      allAnswerValues = savedAnswer.inputs.map((i) => i.value || "");
    }
  }

  let html = `<div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center;">`;

  let answerOffset = 0;
  trees.forEach((treeData) => {
    const blanksInTree = collectBlanks(treeData);
    const treeAnswers = allAnswerValues.slice(
      answerOffset,
      answerOffset + blanksInTree.length,
    );

    html += `
      <div style="
        border:1px solid #ddd;border-radius:10px;
        padding:16px;background:#fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
        display:inline-block;text-align:center;
      ">
        ${buildSVGTree(treeData, treeAnswers)}
      </div>
    `;
    answerOffset += blanksInTree.length;
  });

  html += `</div>`;

  if (question.hcf) {
    const hcfFilled =
      savedAnswer && savedAnswer.hcf ? savedAnswer.hcf.trim() : "";
    const hcfCorrect = (question.hcf.answer || "").trim();
    const hcfRight = hcfFilled.toLowerCase() === hcfCorrect.toLowerCase();
    const display = mode === "correct" ? hcfCorrect : hcfFilled || "?";
    const bg =
      mode === "correct" ? "#d4edda" : hcfRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : hcfRight ? "#155724" : "#721c24";

    const labelText = question.hcf.question2 || "GCF = ___";
    const replaced = labelText.replace(
      "___",
      `
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        min-width:50px;height:34px;background:${bg};color:${color};
        border-radius:6px;font-weight:bold;padding:0 10px;
      ">${display}</span>
    `,
    );

    html += `
      <div style="text-align:center;margin-top:16px;font-size:1.1em;font-weight:bold;">
        ${replaced}
      </div>
    `;
  }

  return html;
}

function renderTreeQuestion(q, optionsElement, index) {
  treeInputs = [];
  renderedTreeRoot = [];

  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.style.justifyContent = "center";
  optionsElement.style.width = "100%";

  const container = document.createElement("div");
  container.className = "tree-question-container";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.width = "100%";
  container.style.textAlign = "center";

  if (q.question) {
    const qText = document.createElement("div");
    qText.style.fontSize = "1.4em";
    qText.style.fontWeight = "bold";
    qText.style.textAlign = "center";
    qText.style.marginBottom = "10px";
    qText.style.width = "100%";
    qText.innerHTML =
      typeof q.question === "string"
        ? q.question
        : q.question.map((p) => (typeof p === "string" ? p : "")).join("");
    container.appendChild(qText);
  }

  let html = `
    <div id="treeSVGWrapper"
       style="display:flex;justify-content:center;align-items:flex-start;
              gap:40px;width:100%;margin-top:20px;">
    </div>
  `;

  if (q.hcf !== undefined) {
    const questionText = q.hcf.question2 || "HCF = ___";
    html += `
      <div class="questionText" style="text-align:center; margin-top:20px; font-size:2.2rem;">
        ${questionText.replace(
          "___",
          `<input 
            type="text"
            class="answer-input tree-hcf-input"
            data-q="${index}"
            style="
              width: 80px;
              height: 36px;
              font-size: 2rem;
              text-align: center;
              border: 2px solid #007bff;
              border-radius: 6px;
              padding: 4px;
              vertical-align: middle;
            "
          />`,
        )}
      </div>
    `;
  }

  container.innerHTML = html;
  optionsElement.appendChild(container);

  if (q.trees) {
    q.trees.forEach((treeObj) => {
      drawTreeSVG(treeObj.tree, index);
    });
  } else if (q.tree) {
    drawTreeSVG(q.tree, index);
  }

  restoreTreeAnswers(index);

  treeInputs.forEach((item) => {
    item.element.addEventListener("input", () => handleTreeInputChange(index));
  });

  const hcfInput = container.querySelector(".tree-hcf-input");
  if (hcfInput) {
    hcfInput.addEventListener("input", () => handleTreeInputChange(index));
  }
}

function drawTreeSVG(treeData, qIndex) {
  const width = 450;
  const levelGap = 90;
  const nodeRadius = 25;
  const nodes = [];
  const links = [];
  let xCounter = 0;

  function layout(node, depth = 0, parent = null) {
    const current = {
      value: node.value,
      answer: node.answer,
      depth,
      parent,
      children: [],
      x: 0,
      y: depth * levelGap + 40,
    };

    nodes.push(current);

    if (!node.children || node.children.length === 0) {
      current.x = xCounter * 80 + 60;
      xCounter++;
    } else {
      const childPositions = [];
      node.children.forEach((child) => {
        const childNode = layout(child, depth + 1, current);
        current.children.push(childNode);
        links.push({ parent: current, child: childNode });
        childPositions.push(childNode.x);
      });
      current.x =
        (Math.min(...childPositions) + Math.max(...childPositions)) / 2;
    }

    return current;
  }

  const root = layout(treeData);
  renderedTreeRoot.push(root);

  const height = Math.max(...nodes.map((n) => n.y)) + 80;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  links.forEach((link) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", link.parent.x);
    line.setAttribute("y1", link.parent.y + nodeRadius);
    line.setAttribute("x2", link.child.x);
    line.setAttribute("y2", link.child.y - nodeRadius);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", nodeRadius);
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", "2");
    node.circle = circle;
    group.appendChild(circle);

    if (node.value === "" || node.value === "_" || node.value == null) {
      const foreign = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "foreignObject",
      );
      foreign.setAttribute("x", node.x - 20);
      foreign.setAttribute("y", node.y - 15);
      foreign.setAttribute("width", 40);
      foreign.setAttribute("height", 30);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "answer-input tree-input";
      input.style.width = "38px";
      input.style.textAlign = "center";
      input.style.border = "2px solid transparent";
      input.style.outline = "none";
      input.style.fontWeight = "bold";
      input.dataset.q = qIndex;

      treeInputs.push({
        element: input,
        answer: node.answer,
        node: node,
      });

      foreign.appendChild(input);
      group.appendChild(foreign);
    } else {
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y + 5);
      text.setAttribute("text-anchor", "middle");
      text.textContent = node.value;
      group.appendChild(text);
    }

    svg.appendChild(group);
  });

  document.getElementById("treeSVGWrapper").appendChild(svg);
}

function handleTreeInputChange(qIndex) {
  const values = {
    type: "tree",
    inputs: [],
    hcf: null,
    image: null,
  };

  treeInputs.forEach((item) => {
    values.inputs.push({
      value: item.element.value.trim(),
      answer: item.answer,
    });
  });

  const hcfInput = document.querySelector(".tree-hcf-input");
  if (hcfInput) values.hcf = hcfInput.value.trim();

  Ansgiven[qIndex] = values;
  saveToLocalStorage("Ansgiven", Ansgiven);

  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreTreeAnswers(index) {
  if (!Ansgiven[index] || Ansgiven[index].type !== "tree") return;

  const saved = Ansgiven[index];

  if (saved.inputs) {
    treeInputs.forEach((item, i) => {
      if (saved.inputs[i]) {
        item.element.value = saved.inputs[i].value || "";
      }
    });
  }

  const hcfInput = document.querySelector(".tree-hcf-input");
  if (hcfInput && saved.hcf) {
    hcfInput.value = saved.hcf;
  }
}

// ============================================================
// LCM REVIEW HTML
// ============================================================

function buildLCMReviewHTML(question, resultValues, mode) {
  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;background:${bg};color:${color};border-bottom:2px solid #999;">${display}</td>`;
    }
    if (val === null || val === undefined) {
      return `<td style="border-bottom:2px solid #999;"></td>`;
    }
    return `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;border-bottom:2px solid #999;">${val}</td>`;
  }

  let html = `<table style="border-collapse:collapse;margin:8px auto;">`;

  question.steps.forEach((step, stepIndex) => {
    const isLast = stepIndex === question.steps.length - 1;
    html += `<tr>`;

    if (step.divisor === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                border-right:3px solid #333;
                ${!isLast ? "border-bottom:2px solid #999;" : ""}
                background:${bg};color:${color};">${display}</td>`;
    } else if (step.divisor === null || step.divisor === undefined) {
      html += `<td style="border-right:3px solid #333;${!isLast ? "border-bottom:2px solid #999;" : ""}"></td>`;
    } else {
      html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                border-right:3px solid #333;
                ${!isLast ? "border-bottom:2px solid #999;" : ""}">${step.divisor}</td>`;
    }

    step.values.forEach((val) => {
      if (val === "_") {
        const filled = (resultValues[inputIndex] || "").trim();
        const correct = (question.answer[inputIndex] || "").trim();
        const isRight = filled.toLowerCase() === correct.toLowerCase();
        const display = mode === "correct" ? correct : filled || "?";
        const bg =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const color =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
        inputIndex++;
        html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                  ${!isLast ? "border-bottom:2px solid #999;" : ""}
                  background:${bg};color:${color};">${display}</td>`;
      } else {
        html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                  ${!isLast ? "border-bottom:2px solid #999;" : ""}">${val ?? ""}</td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</table>`;

  if ("lcm" in question) {
    const hcfFilled = (resultValues[inputIndex] || "").trim();
    const hcfCorrect = (question.answer[inputIndex] || "").trim();
    const hcfRight = hcfFilled.toLowerCase() === hcfCorrect.toLowerCase();
    const display = mode === "correct" ? hcfCorrect : hcfFilled || "?";
    const bg =
      mode === "correct" ? "#d4edda" : hcfRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : hcfRight ? "#155724" : "#721c24";
    const label = question.resultLabel || "HCF";

    html += `
      <div style="margin-top:10px;font-size:1.1rem;font-weight:bold;display:flex;align-items:center;gap:8px;">
        ${label} = 
        <span style="background:${bg};color:${color};padding:4px 14px;border-radius:6px;font-size:1.1rem;">
          ${display}
        </span>
      </div>
    `;
  }

  return html;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VALUE-TABLE  &  TABLE-GRAPH   (added — nothing above this line is modified)
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Same JSON shape as AC3, so questions can be copied between the two apps.
//
//    { "questionNo": 14,
//      "type": "value-table",
//      "question": [ "..." ],
//      "table": { "rows": [
//        { "label": "x", "cells": [-2, 0, 3, 5, 7, 10] },
//        { "label": "y", "cells":   ["", 1, "", 16, "", 31],
//                        "answers": [-5, 1, 10, 16, 22, 31] }
//      ]}}
//
//    { "questionNo": 15,
//      "type": "table-graph",
//      "question": [ "..." ],
//      "table": { "rows": [ ...same as above... ] },
//      "graph": { "xMin": -5, "xMax": 5, "yMin": -5, "yMax": 5,
//                 "points": [[-3,-1], [-2,0], [-1,1], [0,2]] }}
//
//  PS2 grades everything at the end, so the quiz page has NO right/wrong
//  feedback — plotting is free-form. All marking happens in displayResults().
//
//  Every result-page string below uses INLINE styles only: graph.html renders
//  the stored HTML without loading questions.js or any stylesheet of ours.
// ═══════════════════════════════════════════════════════════════════════════════

var vtGraphPoints = [];

function vtIsBlankCell(value) {
  return value === "" || value === null || value === undefined;
}

// ─── Geometry ────────────────────────────────────────────────────────────────
//  cell = pixels per GRID SQUARE.  px()/py() convert DATA coords → SVG coords.
//  py() subtracts because SVG's y-axis grows downward and maths grows upward.
//
//  xStep / yStep = how many DATA units one grid square is worth (default 1).
//  This is what keeps a tall graph small: y from -16 to 16 with "yStep": 2 is
//  16 squares — the same physical size as -8..8 at step 1 — and the axis is
//  labelled 2, 4, 6 … 16. The two axes are independent, so x can stay at 1
//  while y counts in 2s, or vice versa.
function vtGeom(g, cellSize) {
  var cell = cellSize || g.cellSize || 34;
  var xStep = g.xStep || 1;
  var yStep = g.yStep || 1;
  var pad = Math.max(18, Math.round(cell * 0.95));
  var cols = (g.xMax - g.xMin) / xStep;
  var rows = (g.yMax - g.yMin) / yStep;
  var W = pad * 2 + cols * cell;
  var H = pad * 2 + rows * cell;
  return {
    cell: cell, pad: pad, W: W, H: H,
    xStep: xStep, yStep: yStep, cols: cols, rows: rows,
    xMin: g.xMin, xMax: g.xMax, yMin: g.yMin, yMax: g.yMax,
    px: function (x) { return pad + ((x - g.xMin) / xStep) * cell; },
    py: function (y) { return pad + ((g.yMax - y) / yStep) * cell; },
  };
}

// Result graphs shrink to roughly 200px wide whatever the axis range is.
// Measured in grid squares, not data units, so a stepped axis isn't punished.
function vtResultCell(g) {
  var span = Math.max(1, (g.xMax - g.xMin) / (g.xStep || 1));
  return Math.max(9, Math.min(18, Math.round(190 / span)));
}

// ─── Static grid (axes, ticks, labels) — shared by quiz page and results ─────
function vtGridSVG(G, interactive) {
  var s = "";
  var i;
  var thin = G.cell < 20 ? 0.8 : 1;
  var axisW = G.cell < 20 ? 1.6 : 2.5;
  var fs = Math.max(6, Math.min(13, Math.round(G.cell * 0.38)));
  // when squares get tiny, label every 2nd one instead of every one
  var thinLabels = G.cell < 14 ? 2 : 1;
  var xLabelEvery = G.xStep * thinLabels;
  var yLabelEvery = G.yStep * thinLabels;
  var gridColor = "#13a300"; // matches the grid lines in AC3

  // one line per grid square — i walks in DATA units, so it steps by x/yStep
  for (i = G.xMin; i <= G.xMax; i += G.xStep) {
    s += '<line x1="' + G.px(i) + '" y1="' + G.py(G.yMax) + '" x2="' + G.px(i) +
         '" y2="' + G.py(G.yMin) + '" stroke="' + gridColor + '" stroke-width="' + thin + '"/>';
  }
  for (i = G.yMin; i <= G.yMax; i += G.yStep) {
    s += '<line x1="' + G.px(G.xMin) + '" y1="' + G.py(i) + '" x2="' + G.px(G.xMax) +
         '" y2="' + G.py(i) + '" stroke="' + gridColor + '" stroke-width="' + thin + '"/>';
  }

  s += '<line x1="' + (G.px(G.xMin) - 6) + '" y1="' + G.py(0) + '" x2="' + (G.px(G.xMax) + 10) +
       '" y2="' + G.py(0) + '" stroke="#111" stroke-width="' + axisW + '"/>';
  s += '<line x1="' + G.px(0) + '" y1="' + (G.py(G.yMin) + 6) + '" x2="' + G.px(0) +
       '" y2="' + (G.py(G.yMax) - 10) + '" stroke="#111" stroke-width="' + axisW + '"/>';

  for (i = G.xMin; i <= G.xMax; i += G.xStep) {
    if (i === 0 || i % xLabelEvery !== 0) continue;
    s += '<text x="' + G.px(i) + '" y="' + (G.py(0) + fs + 4) + '" text-anchor="middle" font-size="' +
         fs + '" font-weight="bold" fill="#111">' + i + "</text>";
  }
  for (i = G.yMin; i <= G.yMax; i += G.yStep) {
    if (i === 0 || i % yLabelEvery !== 0) continue;
    s += '<text x="' + (G.px(0) - 5) + '" y="' + (G.py(i) + fs * 0.35) + '" text-anchor="end" font-size="' +
         fs + '" font-weight="bold" fill="#111">' + i + "</text>";
  }
  s += '<text x="' + (G.px(0) - 5) + '" y="' + (G.py(0) + fs + 4) +
       '" text-anchor="end" font-size="' + fs + '" font-weight="bold" fill="#111">0</text>';
  s += '<text x="' + (G.px(G.xMax) + 9) + '" y="' + (G.py(0) - 6) + '" text-anchor="middle" font-size="' +
       (fs + 2) + '" font-weight="bold" font-style="italic" fill="#111">x</text>';
  s += '<text x="' + (G.px(0) + 8) + '" y="' + (G.py(G.yMax) - 5) + '" text-anchor="middle" font-size="' +
       (fs + 2) + '" font-weight="bold" font-style="italic" fill="#111">y</text>';

  if (interactive) {
    s += '<rect id="vt-hit" x="' + G.px(G.xMin) + '" y="' + G.py(G.yMax) + '" width="' +
         (G.cols * G.cell) + '" height="' + (G.rows * G.cell) +
         '" fill="transparent" style="cursor:crosshair;"/>';
  }
  return s;
}

// ─── Plotted points + joining line ───────────────────────────────────────────
//  marks == null  → plain red dots (quiz page, and the "correct answer" column)
//  marks != null  → green dot for right, red cross for wrong
function vtPlotSVG(G, points, marks, showLine, expectedCount) {
  var s = "";
  var r = Math.max(2.5, Math.min(5.5, G.cell * 0.17));
  var ring = r * 1.9;

  if (showLine !== false && points.length > 1) {
    var ordered = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var coords = ordered.map(function (p) { return G.px(p[0]) + "," + G.py(p[1]); }).join(" ");
    var stroke = "#e0002b";
    if (marks) {
      var allOk = marks.length === expectedCount && marks.every(Boolean);
      stroke = allOk ? "#2e9e4f" : "#b0b0b0";
    }
    s += '<polyline points="' + coords + '" fill="none" stroke="' + stroke +
         '" stroke-width="' + Math.max(1.4, r * 0.5) + '"/>';
  }

  points.forEach(function (p, idx) {
    var cx = G.px(p[0]), cy = G.py(p[1]);
    if (!marks) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#e0002b" stroke="#fff" stroke-width="1"/>';
    } else if (marks[idx]) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ring + '" fill="#fff" stroke="#2e9e4f" stroke-width="1.8"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2e9e4f"/>';
    } else {
      var d = r * 1.15;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ring + '" fill="#fff" stroke="#f44336" stroke-width="1.8"/>';
      s += '<line x1="' + (cx - d) + '" y1="' + (cy - d) + '" x2="' + (cx + d) + '" y2="' + (cy + d) +
           '" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>';
      s += '<line x1="' + (cx - d) + '" y1="' + (cy + d) + '" x2="' + (cx + d) + '" y2="' + (cy - d) +
           '" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>';
    }
  });
  return s;
}

// ─── Interactive graph (quiz page only) ──────────────────────────────────────
//  The svg carries no max-width of its own — whatever wrapper it is dropped
//  into caps the size. Clicking stays accurate at any size because
//  vtHandleGraphClick rescales by G.W / rect.width.
function vtBuildInteractiveGraph(g) {
  var G = vtGeom(g);
  return '<svg id="vt-svg" width="' + G.W + '" height="' + G.H + '" viewBox="0 0 ' + G.W + " " + G.H +
         '" style="width:100%;height:auto;display:block;">' +
         vtGridSVG(G, true) +
         '<g id="vt-plot"></g></svg>';
}

function vtRedraw() {
  var q = questions[i];
  if (!q || !q.graph) return;
  var plot = document.getElementById("vt-plot");
  if (!plot) return;
  var G = vtGeom(q.graph);
  plot.innerHTML = vtPlotSVG(G, vtGraphPoints, null, q.graph.showLine, q.graph.points.length);
}

function vtHandleGraphClick(e) {
  var q = questions[i];
  if (!q || !q.graph) return;
  var svg = document.getElementById("vt-svg");
  if (!svg) return;
  var G = vtGeom(q.graph);

  // Undo any CSS scaling: the svg may be displayed narrower than its viewBox
  var rect = svg.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (G.W / rect.width);
  var sy = (e.clientY - rect.top) * (G.H / rect.height);

  // Snap to the nearest grid intersection (half-a-square click tolerance).
  // One square is xStep/yStep data units, so the snap lands on 0, 2, 4 … when
  // the axis counts in 2s.
  var x = G.xMin + Math.round((sx - G.pad) / G.cell) * G.xStep;
  var y = G.yMax - Math.round((sy - G.pad) / G.cell) * G.yStep;
  if (x < G.xMin || x > G.xMax || y < G.yMin || y > G.yMax) return;

  var at = -1;
  vtGraphPoints.forEach(function (p, idx) { if (p[0] === x && p[1] === y) at = idx; });
  if (at >= 0) vtGraphPoints.splice(at, 1);
  else vtGraphPoints.push([x, y]);

  vtRedraw();
  handleInputAnswerChange();
}

// ─── Table markup (quiz page) ────────────────────────────────────────────────
//  compact = true  → the table is sharing its row with a graph, so it is a bit
//                    narrower than a standalone one. The type stays large and
//                    the cells hug it, so the numbers don't swim in empty space.
function vtBuildTableHTML(q, compact) {
  var rows = q.table.rows;
  var hasLabels = rows.some(function (row) { return row.label !== undefined; });
  var colCount = Math.max.apply(null, rows.map(function (r) { return r.cells.length; }));
  var labelW = hasLabels ? (compact ? 58 : 60) : 0;
  var naturalW = labelW + colCount * (compact ? 76 : 80);
  var labelPct = ((labelW / naturalW) * 100).toFixed(2);
  var n = 0;

  var cellCss = compact
    ? "height:clamp(32px,6vw,46px);font-size:clamp(0.95rem,3vw,1.6rem);"
    : "height:clamp(44px,8.5vw,70px);font-size:clamp(1rem,3.2vw,2rem);";
  var inputCss = compact
    ? "height:clamp(26px,5.2vw,38px);font-size:clamp(0.9rem,2.8vw,1.45rem);"
    : "height:clamp(36px,7.6vw,60px);font-size:clamp(0.95rem,3vw,1.9rem);";
  var cellPad = compact ? "padding:1px 2px;" : "padding:3px 2px;";

  var html = '<div style="width:100%;max-width:100%;display:flex;justify-content:center;">' +
    '<table style="border-collapse:collapse;background:#fff;width:100%;max-width:' + naturalW +
    'px;table-layout:fixed;"><tbody>';

  rows.forEach(function (row, r) {
    html += "<tr>";
    if (hasLabels) {
      html += '<td style="border:2px solid #333;text-align:center;font-weight:bold;background:#fafafa;' +
              cellPad + cellCss + "width:" +
              labelPct + '%;">' + (row.label || "") + "</td>";
    }
    row.cells.forEach(function (cell, c) {
      html += '<td style="border:2px solid #333;text-align:center;' + cellPad +
              cellCss + 'font-weight:bold;">';
      if (vtIsBlankCell(cell)) {
        html += '<input type="text" class="vt-answer-input" id="vt_cell_' + r + "_" + c +
                '" autocomplete="off" style="width:100%;min-width:0;max-width:100%;padding:0 2px;' +
                inputCss + "text-align:center;" +
                'font-weight:bold;border:2px solid #667eea;border-radius:8px;background:rgba(255,255,255,0.85);outline:none;"/>';
        n++;
      } else {
        html += "<span>" + cell + "</span>";
      }
      html += "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table></div>";
  return html;
}

// The table's natural width — must stay in step with vtBuildTableHTML above.
function vtTableNaturalW(q, compact) {
  var rows = q.table.rows;
  var hasLabels = rows.some(function (row) { return row.label !== undefined; });
  var colCount = Math.max.apply(null, rows.map(function (r) { return r.cells.length; }));
  return (hasLabels ? (compact ? 58 : 60) : 0) + colCount * (compact ? 76 : 80);
}

// ─── Loaders ─────────────────────────────────────────────────────────────────
function vtPrepareContainer(optionsElement) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");
  var box = document.createElement("div");
  box.className = "question-container";
  box.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;min-width:0;";
  optionsElement.appendChild(box);
  return box;
}

function vtWireInputs(optionsElement, saved) {
  var inputs = optionsElement.querySelectorAll(".vt-answer-input");
  inputs.forEach(function (input, idx) {
    input.addEventListener("input", handleInputAnswerChange);
    input.addEventListener("keyup", function (e) {
      if (e.key === "Enter") checkAnswer();
    });
    if (saved && saved[idx] !== undefined) input.value = saved[idx];
  });
}

function loadValueTableQuestion(randomQuestion, optionsElement, index) {
  var box = vtPrepareContainer(optionsElement);
  box.innerHTML = vtBuildTableHTML(randomQuestion);
  var prev = Ansgiven[index];
  vtWireInputs(optionsElement, Array.isArray(prev) ? prev : null);
}

function loadTableGraphQuestion(randomQuestion, optionsElement, index) {
  var box = vtPrepareContainer(optionsElement);

  var tableW = vtTableNaturalW(randomQuestion, true);
  // A touch under the grid's natural width, so it sits level with the table
  // rather than towering over it.
  var graphW = Math.round(vtGeom(randomQuestion.graph).W * 0.9);

  box.innerHTML =
    '<div class="vt-tg-row">' +
      '<div class="vt-tg-left" style="--tg-w:' + tableW + 'px;">' +
        vtBuildTableHTML(randomQuestion, true) +
        '<p style="font-size:clamp(0.75rem,2vw,0.95rem);color:#666;text-align:center;margin:0;">' +
        "Click a point on the grid to plot it. Click it again to remove it.</p>" +
      "</div>" +
      '<div class="vt-tg-graph" style="--tg-w:' + graphW + 'px;">' +
        vtBuildInteractiveGraph(randomQuestion.graph) +
      "</div>" +
    "</div>";

  var prev = Ansgiven[index];
  var savedInputs = prev && prev.inputs ? prev.inputs : null;
  vtGraphPoints = prev && prev.points ? prev.points.slice() : [];

  vtWireInputs(optionsElement, savedInputs);

  var svg = document.getElementById("vt-svg");
  if (svg) svg.addEventListener("click", vtHandleGraphClick);
  vtRedraw();
}

// ─── Grading ─────────────────────────────────────────────────────────────────
//  Flattens the blank cells row-major, exactly the order vtBuildTableHTML
//  creates the inputs in, so answers[] lines up with the DOM.
function vtFlattenCorrect(q) {
  var correct = [];
  q.table.rows.forEach(function (row) {
    row.cells.forEach(function (cell, c) {
      if (!vtIsBlankCell(cell)) return;
      var a = (row.answers || [])[c];
      correct.push(a === undefined || a === null ? "" : String(a));
    });
  });
  return correct;
}

function vtTableIsCorrect(q, answers) {
  if (!answers) return false;
  var correct = vtFlattenCorrect(q);
  return correct.every(function (ca, idx) {
    return compareAnswers(answers[idx], ca);
  });
}

//  Set equality: every plotted point is expected, and none are missing.
//  Duplicates are impossible because clicking a plotted point removes it.
function vtGraphIsCorrect(q, points) {
  if (!points) return false;
  var expected = q.graph.points.map(function (p) { return p[0] + "," + p[1]; });
  var keys = points.map(function (p) { return p[0] + "," + p[1]; });
  var uniq = {};
  keys.forEach(function (k) { uniq[k] = 1; });
  if (Object.keys(uniq).length !== expected.length) return false;
  return keys.every(function (k) { return expected.indexOf(k) !== -1; });
}

function vtQuestionIsCorrect(q, answer) {
  if (!answer) return false;
  if (q.type === "value-table") {
    return Array.isArray(answer) && vtTableIsCorrect(q, answer);
  }
  return (
    vtTableIsCorrect(q, answer.inputs) && vtGraphIsCorrect(q, answer.points)
  );
}

// ─── Result rendering (compact, inline styles only) ──────────────────────────
function vtBuildResultTable(q, answers, showColors) {
  var rows = q.table.rows;
  var hasLabels = rows.some(function (row) { return row.label !== undefined; });
  var correct = vtFlattenCorrect(q);
  var idx = 0;

  var html = '<table style="border-collapse:collapse;background:#fff;margin:4px auto;"><tbody>';
  rows.forEach(function (row) {
    html += "<tr>";
    if (hasLabels) {
      html += '<td style="border:1.5px solid #555;text-align:center;font-weight:bold;background:#fafafa;' +
              'padding:2px 6px;min-width:26px;height:28px;font-size:0.85em;">' + (row.label || "") + "</td>";
    }
    row.cells.forEach(function (cell) {
      var bg = "#fff", color = "#111", value;
      if (vtIsBlankCell(cell)) {
        value = answers && answers[idx] !== undefined ? answers[idx] : "";
        if (showColors) {
          var ok = compareAnswers(value, correct[idx]);
          bg = ok ? "#d4edda" : "#f8d7da";
          color = ok ? "#155724" : "#721c24";
        }
        idx++;
      } else {
        value = cell;
      }
      html += '<td style="border:1.5px solid #555;text-align:center;padding:2px 6px;min-width:34px;' +
              "height:28px;font-size:0.85em;font-weight:bold;background:" + bg + ";color:" + color +
              ';">' + (value === "" ? "&nbsp;" : value) + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function vtBuildResultGraph(q, points, showColors) {
  var G = vtGeom(q.graph, vtResultCell(q.graph));
  var marks = null;
  if (showColors) {
    var expected = q.graph.points.map(function (p) { return p[0] + "," + p[1]; });
    marks = points.map(function (p) {
      return expected.indexOf(p[0] + "," + p[1]) !== -1;
    });
  }
  // Displayed size is capped so a wide axis range can't blow up the results
  // page. Override per question with  "graph": { "resultWidth": 300 }.
  var dispW = q.graph.resultWidth
    ? q.graph.resultWidth
    : Math.min(G.W, 240);
  return '<svg width="' + G.W + '" height="' + G.H + '" viewBox="0 0 ' + G.W + " " + G.H +
         '" style="width:' + dispW + "px;max-width:100%;height:auto;display:block;margin:4px auto;\">" +
         vtGridSVG(G, false) +
         vtPlotSVG(G, points, marks, q.graph.showLine, q.graph.points.length) +
         "</svg>";
}

//  answer === null  → renders the CORRECT answer (no colours)
//  answer supplied  → renders what the student did, marked green/red
function vtBuildResultHTML(q, answer, showColors) {
  var tableVals, points;
  if (showColors) {
    tableVals = q.type === "value-table" ? answer : answer.inputs;
    points = q.type === "value-table" ? [] : answer.points || [];
  } else {
    tableVals = vtFlattenCorrect(q);
    points = q.type === "value-table" ? [] : q.graph.points;
  }
  if (q.type !== "table-graph") {
    return '<div style="display:inline-block;text-align:center;vertical-align:top;max-width:100%;">' +
           vtBuildResultTable(q, tableVals, showColors) +
           "</div>";
  }

  // table-graph: table left, grid right — the same shape as the quiz page.
  // Inline styles only: this markup is stored and re-rendered on graph.html,
  // which does not load the quiz page's stylesheet.
  return '<div style="display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;' +
         'gap:10px;text-align:center;vertical-align:top;max-width:100%;">' +
         '<div style="min-width:0;">' + vtBuildResultTable(q, tableVals, showColors) + "</div>" +
         '<div style="min-width:0;">' + vtBuildResultGraph(q, points, showColors) + "</div>" +
         "</div>";
}

// ════════════════════════════════════════════════════════════════════════════
//  GRAPH type  (ported from AC3 "type":"graph")
//  A standalone line-sketching question: the student plots points on the grid
//  to draw the given straight line. It reuses vtGeom / vtGridSVG so it matches
//  PS2's other graphs, but grades AC3-style — any points ON the line and INSIDE
//  the allowed range count, ≥2 are needed, and every mustPlot point must be
//  present. Unlike AC3 there is NO on-click feedback: the plot is only marked
//  right/wrong on the report page (graph.html), like every other PS2 question.
//
//  q.graph = {
//    xMin,xMax,yMin,yMax,           // grid extent
//    line: { y:2 } | { x:-3 } | { m:[num,den]|m, b:0 },
//    range: { axis:"x"|"y", from:-2, to:2 },   // band the student may plot in
//    mustPlot: [[x,y], ...],        // points that must be plotted (optional)
//    showLine: true|false,          // draw the joining line (default true)
//    resultWidth: 300               // optional cap on report-page width
//  }
// ════════════════════════════════════════════════════════════════════════════
var glGraphPoints = [];

// Every line form reduces to integers A·x + B·y = C, so the check stays exact.
// The line may be given three ways:
//   g.line     : { y:2 } | { x:-3 } | { m:[num,den]|m, b:0 }
//   g.equation : { m:2, b:3 } (same slope form, different key)
//   neither    : derive it from the first two mustPlot points
// Returns null when there isn't enough information to define a line.
function glLineABC(g) {
  var line = g.line || g.equation;
  if (line) {
    if (line.x !== undefined) return { A: 1, B: 0, C: line.x };
    if (line.y !== undefined) return { A: 0, B: 1, C: line.y };
    var num = Array.isArray(line.m) ? line.m[0] : line.m;
    var den = Array.isArray(line.m) ? line.m[1] : 1;
    var b = line.b || 0;
    // y = (num/den)x + b  →  -num·x + den·y = den·b
    return { A: -num, B: den, C: den * b };
  }
  // No explicit line/equation — two mustPlot points define the line exactly.
  var mp = g.mustPlot || [];
  if (mp.length >= 2) {
    var x1 = mp[0][0], y1 = mp[0][1], x2 = mp[1][0], y2 = mp[1][1];
    var A = y2 - y1, B = x1 - x2;
    return { A: A, B: B, C: A * x1 + B * y1 };
  }
  return null;
}

// A point is only accepted if it lies within the range band (on the limited
// axis). The other axis is free; an off-line point is simply marked wrong.
function glInRange(g, x, y) {
  var r = g.range;
  if (!r) return true;
  var v = r.axis === "y" ? y : x;
  return v >= Math.min(r.from, r.to) && v <= Math.max(r.from, r.to);
}

function glOnLine(g, x, y) {
  var abc = glLineABC(g);
  if (!abc) return false;
  return abc.A * x + abc.B * y === abc.C;
}

// The exact integer points on the line, inside the range and the grid — used to
// draw the "correct answer" graph on the report page.
function glCorrectPoints(g) {
  var abc = glLineABC(g);
  if (!abc) return (g.mustPlot || []).slice();
  var xStep = g.xStep || 1;
  var yStep = g.yStep || 1;
  var r = g.range || { axis: "x", from: g.xMin, to: g.xMax };
  var lo = Math.min(r.from, r.to);
  var hi = Math.max(r.from, r.to);
  var pts = [];
  var v, other;
  // walk the grid intersections, and keep a point only when the other
  // coordinate also lands on one — those are the only spots a student can click
  if (r.axis === "y") {
    for (v = lo; v <= hi; v += yStep) {
      if (v < g.yMin || v > g.yMax || abc.A === 0) continue;
      other = (abc.C - abc.B * v) / abc.A; // x
      if (
        Number.isInteger(other) &&
        other >= g.xMin &&
        other <= g.xMax &&
        (other - g.xMin) % xStep === 0
      )
        pts.push([other, v]);
    }
  } else {
    for (v = lo; v <= hi; v += xStep) {
      if (v < g.xMin || v > g.xMax || abc.B === 0) continue;
      other = (abc.C - abc.A * v) / abc.B; // y
      if (
        Number.isInteger(other) &&
        other >= g.yMin &&
        other <= g.yMax &&
        (other - g.yMin) % yStep === 0
      )
        pts.push([v, other]);
    }
  }
  return pts;
}

// The shaded band showing where plotting is allowed (matches AC3's gl-band).
function glBandSVG(G, g) {
  var r = g.range;
  if (!r) return "";
  var lo = Math.min(r.from, r.to);
  var hi = Math.max(r.from, r.to);
  // sized via px()/py() so it stays correct whatever xStep/yStep are
  if (r.axis === "y") {
    return '<rect x="' + G.px(G.xMin) + '" y="' + G.py(hi) + '" width="' +
      (G.cols * G.cell) + '" height="' + (G.py(lo) - G.py(hi)) +
      '" fill="#4c8bf5" fill-opacity="0.10"/>';
  }
  return '<rect x="' + G.px(lo) + '" y="' + G.py(G.yMax) + '" width="' +
    (G.px(hi) - G.px(lo)) + '" height="' + (G.rows * G.cell) +
    '" fill="#4c8bf5" fill-opacity="0.10"/>';
}

// Points + joining line.
//  marks == null  → plain red dots (quiz page, and the "correct answer" column)
//  marks != null  → green dot for right, red cross for wrong; line green when
//                   the whole plot passed, grey otherwise.
function glPlotSVG(G, points, marks, showLine, allOk) {
  var s = "";
  var r = Math.max(2.5, Math.min(5.5, G.cell * 0.17));
  var ring = r * 1.9;

  if (showLine !== false && points.length > 1) {
    var ordered = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var coords = ordered.map(function (p) { return G.px(p[0]) + "," + G.py(p[1]); }).join(" ");
    var stroke = "#e0002b";
    if (marks) stroke = allOk ? "#2e9e4f" : "#b0b0b0";
    s += '<polyline points="' + coords + '" fill="none" stroke="' + stroke +
      '" stroke-width="' + Math.max(1.4, r * 0.5) + '"/>';
  }

  points.forEach(function (p, idx) {
    var cx = G.px(p[0]), cy = G.py(p[1]);
    if (!marks) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#e0002b" stroke="#fff" stroke-width="1"/>';
    } else if (marks[idx]) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ring + '" fill="#fff" stroke="#2e9e4f" stroke-width="1.8"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2e9e4f"/>';
    } else {
      var d = r * 1.15;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ring + '" fill="#fff" stroke="#f44336" stroke-width="1.8"/>';
      s += '<line x1="' + (cx - d) + '" y1="' + (cy - d) + '" x2="' + (cx + d) + '" y2="' + (cy + d) +
        '" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>';
      s += '<line x1="' + (cx - d) + '" y1="' + (cy + d) + '" x2="' + (cx + d) + '" y2="' + (cy - d) +
        '" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>';
    }
  });
  return s;
}

// ─── Interactive graph (quiz page only — no feedback shown) ───────────────────
function glBuildInteractiveGraph(g) {
  var G = vtGeom(g);
  return '<svg id="gl-svg" width="' + G.W + '" height="' + G.H + '" viewBox="0 0 ' + G.W + " " + G.H +
    '" style="width:100%;height:auto;display:block;">' +
    glBandSVG(G, g) +
    vtGridSVG(G, true) +
    '<g id="gl-plot"></g></svg>';
}

function glRedraw() {
  var q = questions[i];
  if (!q || !q.graph) return;
  var plot = document.getElementById("gl-plot");
  if (!plot) return;
  var G = vtGeom(q.graph);
  plot.innerHTML = glPlotSVG(G, glGraphPoints, null, q.graph.showLine, false);
}

function glHandleGraphClick(e) {
  var q = questions[i];
  if (!q || !q.graph) return;
  var svg = document.getElementById("gl-svg");
  if (!svg) return;
  var G = vtGeom(q.graph);

  var rect = svg.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (G.W / rect.width);
  var sy = (e.clientY - rect.top) * (G.H / rect.height);

  // snap to the nearest grid intersection, honouring xStep/yStep
  var x = G.xMin + Math.round((sx - G.pad) / G.cell) * G.xStep;
  var y = G.yMax - Math.round((sy - G.pad) / G.cell) * G.yStep;
  if (x < G.xMin || x > G.xMax || y < G.yMin || y > G.yMax) return;
  if (!glInRange(q.graph, x, y)) return; // clicks outside the band are refused

  var at = -1;
  glGraphPoints.forEach(function (p, idx) { if (p[0] === x && p[1] === y) at = idx; });
  if (at >= 0) glGraphPoints.splice(at, 1);
  else glGraphPoints.push([x, y]);

  glRedraw();
  handleInputAnswerChange();
}

function loadGraphQuestion(randomQuestion, optionsElement, index) {
  var box = vtPrepareContainer(optionsElement);
  var graphW = Math.round(vtGeom(randomQuestion.graph).W * 1.05);

  box.innerHTML =
    '<div class="vt-tg-graph" style="--tg-w:' + graphW + 'px;">' +
      glBuildInteractiveGraph(randomQuestion.graph) +
    "</div>" +
    '<p style="font-size:clamp(0.75rem,2vw,0.95rem);color:#666;text-align:center;margin:0;">' +
    "Click a point on the grid to plot it. Click it again to remove it.</p>";

  var prev = Ansgiven[index];
  glGraphPoints = prev && prev.points ? prev.points.slice() : [];

  var svg = document.getElementById("gl-svg");
  if (svg) svg.addEventListener("click", glHandleGraphClick);
  glRedraw();
}

// ─── Grading (AC3 rule) ───────────────────────────────────────────────────────
//  ≥2 points, every point on the line and inside the range, and every mustPlot
//  point present.
function glGraphIsCorrect(q, answer) {
  var points = answer && answer.points ? answer.points : null;
  if (!points || points.length < 2) return false;
  var everyOk = points.every(function (p) {
    return glInRange(q.graph, p[0], p[1]) && glOnLine(q.graph, p[0], p[1]);
  });
  if (!everyOk) return false;
  var plotted = points.map(function (p) { return p[0] + "," + p[1]; });
  // mustPlot is one accepted set; mustPlotAlt lists further accepted sets.
  var sets = [q.graph.mustPlot || []].concat(q.graph.mustPlotAlt || []);
  return sets.some(function (set) {
    return set.every(function (p) {
      return plotted.indexOf(p[0] + "," + p[1]) !== -1;
    });
  });
}

// ─── Result rendering (report page — inline styles / SVG only) ────────────────
function glBuildResultGraph(q, points, showColors) {
  var g = q.graph;
  var G = vtGeom(g, vtResultCell(g));
  var marks = null;
  var allOk = false;
  if (showColors) {
    marks = points.map(function (p) {
      return glInRange(g, p[0], p[1]) && glOnLine(g, p[0], p[1]);
    });
    allOk = glGraphIsCorrect(q, { points: points });
  }
  var dispW = g.resultWidth ? g.resultWidth : Math.min(G.W, 240);
  return '<svg width="' + G.W + '" height="' + G.H + '" viewBox="0 0 ' + G.W + " " + G.H +
    '" style="width:' + dispW + 'px;max-width:100%;height:auto;display:block;margin:4px auto;">' +
    glBandSVG(G, g) +
    vtGridSVG(G, false) +
    glPlotSVG(G, points, marks, g.showLine, allOk) +
    "</svg>";
}

//  answer === null  → renders the CORRECT answer (the line, no colours)
//  answer supplied  → renders what the student plotted, marked green/red
function glBuildResultHTML(q, answer, showColors) {
  var points = showColors
    ? (answer && answer.points ? answer.points : [])
    : glCorrectPoints(q.graph);
  return '<div style="display:inline-block;text-align:center;vertical-align:top;max-width:100%;">' +
    glBuildResultGraph(q, points, showColors) +
    "</div>";
}

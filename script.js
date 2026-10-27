/* =====================================================
   PROJECT A — STS INSTITUTE SCHEDULE
   Calendar Engine v1.0.0

   Features:
   - Week, Month, and Upcoming views
   - Time-blocked calendar events
   - Create, edit, and delete events
   - Date navigation
   - Local browser storage
   - Responsive calendar
   - Prepared for future Supabase Realtime integration

   Institute Colors:
   White: #FFFFFF
   Teal:  #213A42
   Gold:  #D1A757
===================================================== */

"use strict";

/* =====================================================
   CONFIGURATION
===================================================== */

const ProjectA = {
    version: "1.0.0",

    colors: {
        white: "#FFFFFF",
        teal: "#213A42",
        gold: "#D1A757"
    },

    storageKey: "sts-institute-schedule-events",

    currentView: "week",

    currentDate: new Date(),

    events: [],

    editingEventId: null,

    selectedDate: null
};


/* =====================================================
   DATE UTILITIES
===================================================== */

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseDate(value) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}


function startOfWeek(date) {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();

    // Monday is the first day of the week.
    const difference = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + difference);

    return result;
}


function addDays(date, amount) {
    const result = new Date(date);

    result.setDate(result.getDate() + amount);

    return result;
}


function addMonths(date, amount) {
    const result = new Date(date);

    const originalDay = result.getDate();

    result.setDate(1);
    result.setMonth(result.getMonth() + amount);

    const lastDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0
    ).getDate();

    result.setDate(Math.min(originalDay, lastDay));

    return result;
}


function formatDate(date, options = {}) {
    return date.toLocaleDateString("en-US", options);
}


function formatTime(time) {
    if (!time) return "";

    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


/* =====================================================
   EVENT DATA
===================================================== */

function loadEvents() {
    try {
        const saved = localStorage.getItem(ProjectA.storageKey);

        ProjectA.events = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(ProjectA.events)) {
            ProjectA.events = [];
        }
    } catch (error) {
        console.error("Could not load schedule:", error);

        ProjectA.events = [];
    }
}


function saveEvents() {
    try {
        localStorage.setItem(
            ProjectA.storageKey,
            JSON.stringify(ProjectA.events)
        );

        return true;
    } catch (error) {
        console.error("Could not save schedule:", error);

        alert(
            "The schedule could not be saved in this browser. " +
            "Check your browser storage settings."
        );

        return false;
    }
}


function sortEvents(events) {
    return [...events].sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);

        if (dateComparison !== 0) {
            return dateComparison;
        }

        return a.startTime.localeCompare(b.startTime);
    });
}


function getEventById(id) {
    return ProjectA.events.find(event => event.id === id);
}


/* =====================================================
   EVENT EDITOR
   The modal is generated automatically.
===================================================== */

function createEventModal() {
    if (document.getElementById("eventModal")) return;

    const modal = document.createElement("div");

    modal.id = "eventModal";
    modal.className = "event-modal";

    modal.innerHTML = `
        <div class="modal-backdrop" data-close-modal></div>

        <section
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">STS INSTITUTE</p>
                    <h2 id="modalTitle">Create Event</h2>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    id="closeEventModal"
                    aria-label="Close"
                >&times;</button>
            </div>

            <form id="eventForm">
                <div class="form-field">
                    <label for="eventTitle">Event Name *</label>

                    <input
                        id="eventTitle"
                        name="title"
                        type="text"
                        maxlength="120"
                        placeholder="e.g. Morning Devotions"
                        required
                    >
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="eventDate">Date *</label>

                        <input
                            id="eventDate"
                            name="date"
                            type="date"
                            required
                        >
                    </div>

                    <div class="form-field">
                        <label for="eventCategory">Category</label>

                        <select id="eventCategory" name="category">
                            <option value="Class">Class</option>
                            <option value="Chapel">Chapel</option>
                            <option value="Worship">Worship</option>
                            <option value="Activity">Activity</option>
                            <option value="Meal">Meal</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="eventStart">Start Time *</label>

                        <input
                            id="eventStart"
                            name="startTime"
                            type="time"
                            required
                        >
                    </div>

                    <div class="form-field">
                        <label for="eventEnd">End Time *</label>

                        <input
                            id="eventEnd"
                            name="endTime"
                            type="time"
                            required
                        >
                    </div>
                </div>

                <div class="form-field">
                    <label for="eventLocation">Location</label>

                    <input
                        id="eventLocation"
                        name="location"
                        type="text"
                        maxlength="200"
                        placeholder="Building, room, or location"
                    >
                </div>

                <div class="form-field">
                    <label for="eventDescription">Description</label>

                    <textarea
                        id="eventDescription"
                        name="description"
                        rows="3"
                        maxlength="2000"
                        placeholder="Additional event information..."
                    ></textarea>
                </div>

                <p id="eventFormError" class="form-error" hidden></p>

                <div class="modal-actions">
                    <button
                        type="button"
                        id="deleteEventButton"
                        class="danger-button"
                        hidden
                    >
                        Delete
                    </button>

                    <button
                        type="button"
                        id="cancelEventButton"
                        class="secondary-button"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Event
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(modal);

    addModalStyles();
}


/* =====================================================
   MODAL STYLING
===================================================== */

function addModalStyles() {
    if (document.getElementById("projectAModalStyles")) return;

    const style = document.createElement("style");

    style.id = "projectAModalStyles";

    style.textContent = `
        .event-modal {
            position: fixed;
            inset: 0;
            z-index: 1000;

            display: none;
            align-items: center;
            justify-content: center;

            padding: 18px;
        }

        .event-modal.open {
            display: flex;
        }

        .modal-backdrop {
            position: absolute;
            inset: 0;

            background: rgba(15, 30, 34, 0.65);
            backdrop-filter: blur(3px);
        }

        .modal-panel {
            position: relative;
            z-index: 1;

            width: min(520px, 100%);
            max-height: 90vh;
            overflow-y: auto;

            padding: 26px;

            background: #FFFFFF;
            border-top: 5px solid #D1A757;
            border-radius: 14px;

            box-shadow: 0 20px 70px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;

            margin-bottom: 24px;
        }

        .modal-header h2 {
            color: #213A42;
            font-size: 24px;
        }

        .modal-close {
            width: 36px;
            height: 36px;

            border: none;
            border-radius: 8px;

            background: #F1F4F4;
            color: #213A42;

            font-size: 25px;
        }

        .form-field {
            display: flex;
            flex-direction: column;
            gap: 7px;

            margin-bottom: 17px;
        }

        .form-field label {
            color: #213A42;
            font-size: 12px;
            font-weight: 700;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
            width: 100%;
            min-width: 0;

            padding: 11px 12px;

            border: 1px solid #DDE4E5;
            border-radius: 8px;

            background: #FFFFFF;
            color: #213A42;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
            border-color: #D1A757;
            outline: 2px solid rgba(209, 167, 87, 0.2);
        }

        .form-field textarea {
            resize: vertical;
        }

        .form-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;

            margin-top: 22px;
        }

        .modal-actions button {
            min-height: 40px;
            padding: 9px 14px;

            border-radius: 8px;
            font-weight: 700;
        }

        .modal-actions .primary-button {
            width: auto;
        }

        .secondary-button {
            border: 1px solid #DDE4E5;
            background: #FFFFFF;
            color: #213A42;
        }

        .danger-button {
            margin-right: auto;

            border: 1px solid #B42318;
            background: #FFFFFF;
            color: #B42318;
        }

        .danger-button:hover {
            background: #B42318;
            color: #FFFFFF;
        }

        .form-error {
            margin: 8px 0;
            color: #B42318;
            font-size: 13px;
        }

        .event-block {
            position: absolute;
            overflow: hidden;

            padding: 5px 7px;

            border-left: 3px solid #D1A757;
            border-radius: 5px;

            background: #EAF0F1;
            color: #213A42;

            cursor: pointer;
            text-align: left;

            font-size: 11px;
            line-height: 1.35;
        }

        .event-block strong {
            display: block;
            overflow-wrap: anywhere;
        }

        .event-block span {
            display: block;
            margin-top: 3px;
        }

        .event-block:hover {
            background: #DCE7E9;
        }

        .event-block:focus-visible {
            outline: 2px solid #D1A757;
            outline-offset: -2px;
        }

        .calendar-grid {
            min-width: 650px;
        }

        .calendar-scroll {
            width: 100%;
            overflow-x: auto;
        }

        .week-header {
            display: grid;
            grid-template-columns: 60px repeat(7, minmax(0, 1fr));

            border-bottom: 1px solid #E1E7E8;
        }

        .week-day-heading {
            padding: 12px 4px;

            border-left: 1px solid #E1E7E8;

            color: #718084;
            text-align: center;
            font-size: 11px;
        }

        .week-day-heading strong {
            display: block;
            margin-top: 4px;

            color: #213A42;
            font-size: 16px;
        }

        .week-day-heading.is-today {
            background: #F8F1E2;
        }

        .week-body {
            display: grid;
            grid-template-columns: 60px repeat(7, minmax(0, 1fr));
        }

        .time-labels,
        .day-column {
            position: relative;
        }

        .time-label {
            height: 60px;
            padding: 0 6px;

            color: #718084;
            text-align: right;
            font-size: 10px;

            transform: translateY(-7px);
        }

        .day-column {
            border-left: 1px solid #E1E7E8;
        }

        .day-column.is-today {
            background: rgba(209, 167, 87, 0.06);
        }

        .hour-line {
            height: 60px;
            border-top: 1px solid #E8EDEE;
        }

        .month-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .month-weekday {
            padding: 12px 3px;

            border-bottom: 1px solid #E1E7E8;

            color: #718084;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
        }

        .month-day {
            min-height: 105px;
            padding: 7px;

            overflow: hidden;

            border-right: 1px solid #E8EDEE;
            border-bottom: 1px solid #E8EDEE;

            background: #FFFFFF;

            cursor: pointer;
        }

        .month-day:hover {
            background: #F8F1E2;
        }

        .month-day.outside-month {
            background: #F7F9F9;
            color: #A1AAAC;
        }

        .month-day-number {
            display: inline-grid;
            place-items: center;

            width: 26px;
            height: 26px;

            border-radius: 50%;

            font-size: 12px;
            font-weight: 700;
        }

        .month-day.today .month-day-number {
            background: #213A42;
            color: #FFFFFF;
        }

        .month-event {
            display: block;
            width: 100%;

            margin-top: 4px;
            padding: 4px 5px;

            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            border-left: 2px solid #D1A757;
            border-radius: 3px;

            background: #EAF0F1;
            color: #213A42;

            cursor: pointer;
            text-align: left;
            font-size: 10px;
        }

        .more-events {
            margin-top: 4px;
            color: #718084;
            font-size: 10px;
        }

        .upcoming-list {
            display: grid;
            gap: 10px;
            padding: 16px;
        }

        .upcoming-list .event-card {
            cursor: pointer;
        }

        .upcoming-list .event-card:focus-visible {
            outline: 2px solid #D1A757;
        }

        .event-details {
            padding: 24px;
        }

        .event-details h3 {
            margin-bottom: 10px;
            color: #213A42;
            font-size: 21px;
        }

        .event-details p {
            margin-top: 10px;
            color: #53676C;
            overflow-wrap: anywhere;
        }

        .event-details-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }

        @media (max-width: 600px) {
            .modal-panel {
                padding: 20px;
            }

            .form-row {
                grid-template-columns: minmax(0, 1fr);
                gap: 0;
            }

            .month-day {
                min-height: 68px;
                padding: 3px;
            }

            .month-day-number {
                width: 23px;
                height: 23px;
            }

            .month-event {
                padding: 3px;
                font-size: 9px;
            }

            .month-weekday {
                padding: 9px 0;
                font-size: 10px;
            }

            .week-header,
            .week-body {
                grid-template-columns: 48px repeat(7, minmax(75px, 1fr));
            }

            .time-label {
                padding-right: 4px;
                font-size: 9px;
            }

            .calendar-grid {
                min-width: 0;
            }
        }
    `;

    document.head.appendChild(style);
}


/* =====================================================
   OPEN AND CLOSE EVENT EDITOR
===================================================== */

function openEventModal(eventId = null, date = null) {
    createEventModal();

    const modal = document.getElementById("eventModal");
    const form = document.getElementById("eventForm");

    form.reset();

    ProjectA.editingEventId = eventId;

    const existingEvent = eventId
        ? getEventById(eventId)
        : null;

    document.getElementById("modalTitle").textContent =
        existingEvent ? "Edit Event" : "Create Event";

    document.getElementById("deleteEventButton").hidden =
        !existingEvent;

    document.getElementById("eventFormError").hidden = true;

    document.getElementById("eventDate").value =
        existingEvent?.date ||
        date ||
        dateKey(ProjectA.currentDate);

    document.getElementById("eventStart").value =
        existingEvent?.startTime || "09:00";

    document.getElementById("eventEnd").value =
        existingEvent?.endTime || "10:00";

    document.getElementById("eventTitle").value =
        existingEvent?.title || "";

    document.getElementById("eventCategory").value =
        existingEvent?.category || "Class";

    document.getElementById("eventLocation").value =
        existingEvent?.location || "";

    document.getElementById("eventDescription").value =
        existingEvent?.description || "";

    modal.classList.add("open");

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        document.getElementById("eventTitle").focus();
    }, 50);
}


function closeEventModal() {
    const modal = document.getElementById("eventModal");

    if (!modal) return;

    modal.classList.remove("open");

    document.body.style.overflow = "";

    ProjectA.editingEventId = null;
}


/* =====================================================
   SAVE EVENT
===================================================== */

function handleEventSubmit(event) {
    event.preventDefault();

    const title = document.getElementById("eventTitle")
        .value.trim();

    const date = document.getElementById("eventDate").value;

    const startTime = document.getElementById("eventStart").value;

    const endTime = document.getElementById("eventEnd").value;

    const errorElement = document.getElementById("eventFormError");

    function showError(message) {
        errorElement.textContent = message;
        errorElement.hidden = false;
    }

    errorElement.hidden = true;

    if (!title || !date || !startTime || !endTime) {
        showError("Please complete all required fields.");
        return;
    }

    if (endTime <= startTime) {
        showError("The end time must be later than the start time.");
        return;
    }

    const editingId = ProjectA.editingEventId;

    const existingEvent = editingId
        ? getEventById(editingId)
        : null;

    const eventData = {
        id: existingEvent?.id || crypto.randomUUID(),

        title,

        date,

        startTime,

        endTime,

        category: document.getElementById("eventCategory").value,

        location: document.getElementById("eventLocation")
            .value.trim(),

        description: document.getElementById("eventDescription")
            .value.trim(),

        updatedAt: new Date().toISOString()
    };

    const previousEvents = [...ProjectA.events];

    if (existingEvent) {
        ProjectA.events = ProjectA.events.map(item =>
            item.id === editingId ? eventData : item
        );
    } else {
        ProjectA.events.push(eventData);
    }

    ProjectA.events = sortEvents(ProjectA.events);

    if (!saveEvents()) {
        ProjectA.events = previousEvents;
        return;
    }

    closeEventModal();

    renderCalendar();

    showNotification(
        existingEvent
            ? "Event updated successfully."
            : "Event created successfully."
    );
}


/* =====================================================
   DELETE EVENT
===================================================== */

function deleteEvent(eventId) {
    const event = getEventById(eventId);

    if (!event) return;

    const confirmed = confirm(
        `Delete "${event.title}" from the schedule?`
    );

    if (!confirmed) return;

    const previousEvents = [...ProjectA.events];

    ProjectA.events = ProjectA.events.filter(
        item => item.id !== eventId
    );

    if (!saveEvents()) {
        ProjectA.events = previousEvents;
        return;
    }

    closeEventModal();

    renderCalendar();

    showNotification("Event deleted.");
}


/* =====================================================
   EVENT DETAILS
===================================================== */

function showEventDetails(eventId) {
    const event = getEventById(eventId);

    if (!event) return;

    createEventModal();

    const modal = document.getElementById("eventModal");

    const panel = modal.querySelector(".modal-panel");

    panel.innerHTML = `
        <div class="modal-header">
            <div>
                <p class="eyebrow">
                    ${escapeHTML(event.category || "EVENT")}
                </p>

                <h2>Event Details</h2>
            </div>

            <button
                class="modal-close"
                id="closeEventModal"
                aria-label="Close"
            >&times;</button>
        </div>

        <div class="event-details">
            <h3>${escapeHTML(event.title)}</h3>

            <p>
                <strong>Date:</strong>
                ${escapeHTML(formatDate(parseDate(event.date), {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }))}
            </p>

            <p>
                <strong>Time:</strong>
                ${escapeHTML(formatTime(event.startTime))}
                –
                ${escapeHTML(formatTime(event.endTime))}
            </p>

            ${
                event.location
                    ? `<p><strong>Location:</strong>
                       ${escapeHTML(event.location)}</p>`
                    : ""
            }

            ${
                event.description
                    ? `<p><strong>Description:</strong><br>
                       ${escapeHTML(event.description)
                           .replace(/\n/g, "<br>")}</p>`
                    : ""
            }

            <div class="event-details-actions">
                <button
                    class="primary-button"
                    id="editDetailsButton"
                >
                    Edit Event
                </button>
            </div>
        </div>
    `;

    modal.classList.add("open");

    document.body.style.overflow = "hidden";

    document.getElementById("closeEventModal").onclick =
        closeEventModal;

    modal.querySelector("[data-close-modal]")?.addEventListener(
        "click",
        closeEventModal,
        { once: true }
    );

    document.getElementById("editDetailsButton").onclick = () => {
        openEventModal(event.id);
    };
}


/* =====================================================
   WEEK VIEW
===================================================== */

function renderWeekView() {
    const container = document.getElementById("calendarContainer");

    const weekStart = startOfWeek(ProjectA.currentDate);

    const days = Array.from(
        { length: 7 },
        (_, index) => addDays(weekStart, index)
    );

    const today = dateKey(new Date());

    let header = `
        <div class="week-header">
            <div></div>
    `;

    days.forEach(day => {
        const key = dateKey(day);

        header += `
            <div class="week-day-heading ${
                key === today ? "is-today" : ""
            }">
                ${escapeHTML(formatDate(day, {
                    weekday: "short"
                }))}

                <strong>
                    ${day.getDate()}
                </strong>
            </div>
        `;
    });

    header += "</div>";

    let timeLabels = "";
    let columns = "";

    for (let hour = 0; hour < 24; hour++) {
        const time = new Date();

        time.setHours(hour, 0, 0, 0);

        timeLabels += `
            <div class="time-label">
                ${escapeHTML(time.toLocaleTimeString("en-US", {
                    hour: "numeric"
                }))}
            </div>
        `;
    }

    days.forEach(day => {
        const key = dateKey(day);

        let eventBlocks = "";

        const dayEvents = sortEvents(
            ProjectA.events.filter(event => event.date === key)
        );

        dayEvents.forEach(event => {
            const [startHour, startMinute] =
                event.startTime.split(":").map(Number);

            const [endHour, endMinute] =
                event.endTime.split(":").map(Number);

            const startMinutes = startHour * 60 + startMinute;

            const endMinutes = endHour * 60 + endMinute;

            const top = startMinutes;

            const height = Math.max(20, endMinutes - startMinutes);

            const safeId = escapeHTML(event.id);

            eventBlocks += `
                <button
                    type="button"
                    class="event-block"
                    data-event-id="${safeId}"
                    style="
                        top: ${top}px;
                        height: ${height}px;
                        left: 3px;
                        right: 3px;
                        width: calc(100% - 6px);
                    "
                    title="${escapeHTML(event.title)}"
                >
                    <strong>${escapeHTML(event.title)}</strong>

                    <span>
                        ${escapeHTML(formatTime(event.startTime))}
                    </span>
                </button>
            `;
        });

        let lines = "";

        for (let hour = 0; hour < 24; hour++) {
            lines += '<div class="hour-line"></div>';
        }

        columns += `
            <div class="day-column ${
                key === today ? "is-today" : ""
            }"
                data-day="${key}"
                style="height: 1440px"
            >
                ${lines}
                ${eventBlocks}
            </div>
        `;
    });

    container.innerHTML = `
        <div class="calendar-scroll">
            <div class="calendar-grid">

                ${header}

                <div class="week-body">
                    <div class="time-labels">
                        ${timeLabels}
                    </div>

                    ${columns}
                </div>

            </div>
        </div>
    `;

    // Clicking an empty day opens the event editor.
    container.querySelectorAll(".day-column").forEach(column => {
        column.addEventListener("click", event => {
            if (event.target.closest(".event-block")) return;

            const rect = column.getBoundingClientRect();

            const y = event.clientY - rect.top;

            const minutes = Math.max(
                0,
                Math.min(1439, Math.floor(y))
            );

            const hour = Math.floor(minutes / 60);

            const minute = Math.floor((minutes % 60) / 15) * 15;

            const time =
                String(hour).padStart(2, "0") +
                ":" +
                String(minute).padStart(2, "0");

            openEventModal(null, column.dataset.day);

            document.getElementById("eventStart").value = time;

            const endMinutes = Math.min(
                1439,
                hour * 60 + minute + 60
            );

            const endHour = Math.floor(endMinutes / 60);

            const endMinute = endMinutes % 60;

            document.getElementById("eventEnd").value =
                String(endHour).padStart(2, "0") +
                ":" +
                String(endMinute).padStart(2, "0");
        });
    });

    container.querySelectorAll(".event-block").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();

            showEventDetails(button.dataset.eventId);
        });
    });
}


/* =====================================================
   MONTH VIEW
===================================================== */

function renderMonthView() {
    const container = document.getElementById("calendarContainer");

    const year = ProjectA.currentDate.getFullYear();

    const month = ProjectA.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

    const offset = (firstDay.getDay() + 6) % 7;

    const gridStart = addDays(firstDay, -offset);

    const today = dateKey(new Date());

    const weekdays = [
        "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    ];

    let html = '<div class="month-grid">';

    weekdays.forEach(day => {
        html += `
            <div class="month-weekday">
                ${day}
            </div>
        `;
    });

    // Always display complete calendar weeks.
    const totalDays = Math.ceil(
        (offset + lastDay.getDate()) / 7
    ) * 7;

    for (let i = 0; i < totalDays; i++) {
        const day = addDays(gridStart, i);

        const key = dateKey(day);

        const dayEvents = sortEvents(
            ProjectA.events.filter(event => event.date === key)
        );

        html += `
            <div
                class="month-day ${
                    day.getMonth() !== month ? "outside-month" : ""
                } ${
                    key === today ? "today" : ""
                }"
                data-day="${key}"
            >
                <span class="month-day-number">
                    ${day.getDate()}
                </span>
        `;

        dayEvents.slice(0, 3).forEach(event => {
            html += `
                <button
                    class="month-event"
                    type="button"
                    data-event-id="${escapeHTML(event.id)}"
                    title="${escapeHTML(event.title)}"
                >
                    ${escapeHTML(event.title)}
                </button>
            `;
        });

        if (dayEvents.length > 3) {
            html += `
                <div class="more-events">
                    +${dayEvents.length - 3} more
                </div>
            `;
        }

        html += "</div>";
    }

    html += "</div>";

    container.innerHTML = html;

    container.querySelectorAll(".month-day").forEach(cell => {
        cell.addEventListener("click", event => {
            if (event.target.closest(".month-event")) return;

            openEventModal(null, cell.dataset.day);
        });
    });

    container.querySelectorAll(".month-event").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();

            showEventDetails(button.dataset.eventId);
        });
    });
}


/* =====================================================
   UPCOMING VIEW
===================================================== */

function renderUpcomingView() {
    const container = document.getElementById("calendarContainer");

    const today = dateKey(new Date());

    const events = sortEvents(
        ProjectA.events.filter(event => event.date >= today)
    );

    if (!events.length) {
        container.innerHTML = `
            <div class="calendar-placeholder">
                <div class="placeholder-icon">&#128197;</div>

                <h3>No upcoming events</h3>

                <p>
                    Your upcoming Institute events will appear here.
                </p>

                <button class="primary-button" id="emptyAddEvent">
                    Create Event
                </button>
            </div>
        `;

        document.getElementById("emptyAddEvent").onclick = () => {
            openEventModal();
        };

        return;
    }

    container.innerHTML = `
        <div class="upcoming-list">
            ${events.map(event => `
                <article
                    class="event-card"
                    tabindex="0"
                    role="button"
                    data-event-id="${escapeHTML(event.id)}"
                >
                    <p class="event-date">
                        ${escapeHTML(formatDate(
                            parseDate(event.date),
                            {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                            }
                        ))}
                    </p>

                    <h3>${escapeHTML(event.title)}</h3>

                    <p class="event-time">
                        ${escapeHTML(formatTime(event.startTime))}
                        –
                        ${escapeHTML(formatTime(event.endTime))}
                    </p>

                    ${
                        event.location
                            ? `<p class="event-location">
                                ${escapeHTML(event.location)}
                               </p>`
                            : ""
                    }
                </article>
            `).join("")}
        </div>
    `;

    container.querySelectorAll("[data-event-id]").forEach(card => {
        card.addEventListener("click", () => {
            showEventDetails(card.dataset.eventId);
        });

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();

                showEventDetails(card.dataset.eventId);
            }
        });
    });
}


/* =====================================================
   UPCOMING EVENT SUMMARY
===================================================== */

function renderUpcomingSummary() {
    const container = document.getElementById("upcomingEvents");

    if (!container) return;

    const today = dateKey(new Date());

    const events = sortEvents(
        ProjectA.events.filter(event => event.date >= today)
    ).slice(0, 3);

    if (!events.length) {
        container.innerHTML = `
            <p class="empty-message">
                Your upcoming events will appear here.
            </p>
        `;

        return;
    }

    container.innerHTML = events.map(event => `
        <article
            class="event-card"
            tabindex="0"
            role="button"
            data-event-id="${escapeHTML(event.id)}"
        >
            <p class="event-date">
                ${escapeHTML(formatDate(parseDate(event.date), {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                }))}
            </p>

            <h3>${escapeHTML(event.title)}</h3>

            <p class="event-time">
                ${escapeHTML(formatTime(event.startTime))}
                –
                ${escapeHTML(formatTime(event.endTime))}
            </p>

            ${
                event.location
                    ? `<p class="event-location">
                        ${escapeHTML(event.location)}
                       </p>`
                    : ""
            }
        </article>
    `).join("");

    container.querySelectorAll("[data-event-id]").forEach(card => {
        card.addEventListener("click", () => {
            showEventDetails(card.dataset.eventId);
        });

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();

                showEventDetails(card.dataset.eventId);
            }
        });
    });
}


/* =====================================================
   DATE NAVIGATION
===================================================== */

function updatePeriodTitle() {
    const title = document.getElementById("periodTitle");

    if (!title) return;

    if (ProjectA.currentView === "week") {
        const start = startOfWeek(ProjectA.currentDate);

        const end = addDays(start, 6);

        if (start.getMonth() === end.getMonth()) {
            title.textContent =
                `${formatDate(start, { month: "short" })} ` +
                `${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
        } else {
            title.textContent =
                `${formatDate(start, {
                    month: "short",
                    day: "numeric"
                })} – ${formatDate(end, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                })}`;
        }
    } else if (ProjectA.currentView === "month") {
        title.textContent = formatDate(ProjectA.currentDate, {
            month: "long",
            year: "numeric"
        });
    } else {
        title.textContent = "Upcoming Events";
    }
}


function navigatePeriod(direction) {
    if (ProjectA.currentView === "week") {
        ProjectA.currentDate = addDays(
            ProjectA.currentDate,
            direction * 7
        );
    } else if (ProjectA.currentView === "month") {
        ProjectA.currentDate = addMonths(
            ProjectA.currentDate,
            direction
        );
    } else {
        ProjectA.currentDate = addDays(
            ProjectA.currentDate,
            direction * 7
        );
    }

    renderCalendar();
}


function changeView(view) {
    if (!["week", "month", "upcoming"].includes(view)) {
        return;
    }

    ProjectA.currentView = view;

    document.querySelectorAll(".nav-button").forEach(button => {
        const active = button.dataset.view === view;

        button.classList.toggle("active", active);

        button.setAttribute("aria-pressed", String(active));
    });

    renderCalendar();
}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function showNotification(message) {
    let notification = document.getElementById("projectAToast");

    if (!notification) {
        notification = document.createElement("div");

        notification.id = "projectAToast";

        notification.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 2000;

            max-width: calc(100vw - 40px);
            padding: 14px 20px;

            border-radius: 10px;
            border-bottom: 3px solid #D1A757;

            background: #213A42;
            color: #FFFFFF;

            box-shadow: 0 8px 25px rgba(0,0,0,0.18);

            font-size: 13px;
            font-weight: 600;
        `;

        document.body.appendChild(notification);
    }

    notification.textContent = message;

    notification.style.display = "block";

    clearTimeout(notification.hideTimer);

    notification.hideTimer = setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}


/* =====================================================
   EVENT LISTENERS
===================================================== */

function bindEvents() {
    document.getElementById("previousPeriod").onclick = () => {
        navigatePeriod(-1);
    };

    document.getElementById("nextPeriod").onclick = () => {
        navigatePeriod(1);
    };

    document.getElementById("todayButton").onclick = () => {
        ProjectA.currentDate = new Date();

        renderCalendar();
    };

    document.getElementById("addEventButton").onclick = () => {
        openEventModal();
    };

    document.getElementById("firstEventButton").onclick = () => {
        openEventModal();
    };

    document.querySelectorAll(".nav-button").forEach(button => {
        button.addEventListener("click", () => {
            changeView(button.dataset.view);
        });
    });

    document.getElementById("eventForm").addEventListener(
        "submit",
        handleEventSubmit
    );

    document.getElementById("closeEventModal").onclick =
        closeEventModal;

    document.getElementById("cancelEventButton").onclick =
        closeEventModal;

    document.querySelector("[data-close-modal]").onclick =
        closeEventModal;

    document.getElementById("deleteEventButton").onclick = () => {
        if (ProjectA.editingEventId) {
            deleteEvent(ProjectA.editingEventId);
        }
    };

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeEventModal();
        }
    });
}


/* =====================================================
   RENDER CALENDAR
===================================================== */

function renderCalendar() {
    updatePeriodTitle();

    if (ProjectA.currentView === "week") {
        renderWeekView();
    } else if (ProjectA.currentView === "month") {
        renderMonthView();
    } else {
        renderUpcomingView();
    }

    renderUpcomingSummary();
}


/* =====================================================
   INITIALIZE PROJECT A
===================================================== */

function initProjectA() {
    loadEvents();

    createEventModal();

    bindEvents();

    renderCalendar();

    console.log(
        `%c STS INSTITUTE SCHEDULE v${ProjectA.version} `,
        "background: #213A42; color: #D1A757; font-weight: bold;"
    );

    console.log("Calendar initialized successfully.");

    console.log(
        "Storage: localStorage (this browser only; not real-time synced)."
    );
}


/* =====================================================
   START APPLICATION
===================================================== */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initProjectA,
        { once: true }
    );
} else {
    initProjectA();
}
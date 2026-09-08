/*
 * VS2026 for VS Code
 *
 * Copyright (c) 2026 Sebastian Zapata
 * SPDX-License-Identifier: MIT
 */
 
(() => {
    const editorSelector =
        ".monaco-workbench .part.editor .monaco-editor";
    const tabsSelector =
        ".monaco-workbench .part.editor .tabs-container";

    function hasLayoutTargets() {
        return document.querySelector(editorSelector) &&
            document.querySelector(tabsSelector);
    }

    function dispatchLayoutRefresh() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event("resize"));
            });
        });
    }

    async function refreshInitialLayout() {
        await document.fonts.load(
            '15px "Sebastian Zapata Console"'
        );
        await document.fonts.ready;

        const observer = new MutationObserver(() => {
            if (!hasLayoutTargets()) {
                return;
            }

            observer.disconnect();
            dispatchLayoutRefresh();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        if (hasLayoutTargets()) {
            observer.disconnect();
            dispatchLayoutRefresh();
        }
    }

    void refreshInitialLayout();
})();

(() => {
    const titleSelector =
        ".monaco-workbench .part.editor > .content " +
        ".editor-group-container > .title";

    const observedTitles = new WeakSet();

    function updateFrameTop(title) {
        const group = title.closest(
            ".editor-group-container"
        );

        if (!group) {
            return;
        }

        const height = title.getBoundingClientRect().height;
        const top = Math.max(0, height - 1);

        group.style.setProperty(
            "--ui-editor-frame-top",
            `${top}px`
        );
    }

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            updateFrameTop(entry.target);
        }
    });

    function scanTitles() {
        document.querySelectorAll(titleSelector).forEach((title) => {
            if (!observedTitles.has(title)) {
                observedTitles.add(title);
                resizeObserver.observe(title);
            }

            updateFrameTop(title);
        });
    }

    function start() {
        const mutationObserver =
            new MutationObserver(scanTitles);

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        scanTitles();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();

(() => {
    const trackSelector =
        ".monaco-workbench .part.panel " +
        ".pane-body.output-view " +
        ".monaco-scrollable-element.editor-scrollable " +
        "> .scrollbar.vertical";

    const observedTracks = new WeakSet();

    function updateOverflow(track) {
        const inlineHeight = Number.parseFloat(
            track.style.height
        );
        const renderedHeight =
            track.getBoundingClientRect().height;

        const overflow = Number.isFinite(inlineHeight)
            ? Math.max(0, inlineHeight - renderedHeight)
            : 0;

        const value = `${overflow}px`;

        if (
            track.style.getPropertyValue(
                "--ui-output-scrollbar-overflow"
            ) === value
        ) {
            return;
        }

        track.style.setProperty(
            "--ui-output-scrollbar-overflow",
            value
        );
    }

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            updateOverflow(entry.target);
        }
    });

    const styleObserver = new MutationObserver((entries) => {
        for (const entry of entries) {
            updateOverflow(entry.target);
        }
    });

    function scanTracks() {
        document.querySelectorAll(trackSelector).forEach((track) => {
            if (!observedTracks.has(track)) {
                observedTracks.add(track);
                resizeObserver.observe(track);

                styleObserver.observe(track, {
                    attributes: true,
                    attributeFilter: ["style"]
                });
            }

            updateOverflow(track);
        });
    }

    function start() {
        const treeObserver =
            new MutationObserver(scanTracks);

        treeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        scanTracks();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();

(() => {
    const containerSelector =
        ".monaco-workbench .part.sidebar > .content " +
        "> .composite > .monaco-pane-view " +
        "> .monaco-split-view2.vertical " +
        "> .monaco-scrollable-element " +
        "> .split-view-container";

    const observedContainers = new WeakSet();
    const observedViews = new WeakSet();
    const observedToggles = new WeakSet();

    function readNumber(value, fallback) {
        const number = Number.parseFloat(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function setVariable(element, name, value) {
        const text = `${value}px`;

        if (
            element.style.getPropertyValue(name) === text
        ) {
            return;
        }

        element.style.setProperty(name, text);
    }

    function updateContainer(container) {
        const views = [...container.children].filter((view) => {
            return view.classList.contains(
                "split-view-view"
            );
        });

        if (!views.length) {
            return;
        }

        const items = views.map((view) => {
            const top = readNumber(
                view.style.top,
                view.offsetTop
            );
            const height = readNumber(
                view.style.height,
                view.getBoundingClientRect().height
            );
            const expanded = Boolean(
                view.querySelector(
                    ":scope > .pane " +
                    "> .pane-header" +
                    "[aria-expanded='true']"
                )
            );

            return {
                view,
                top,
                height,
                expanded
            };
        });

        const actualHeight =
            container.getBoundingClientRect().height;

        const nativeBottom = Math.max(
            ...items.map((item) => {
                return item.top + item.height;
            })
        );

        const overflow = Math.max(
            0,
            nativeBottom - actualHeight
        );

        const candidates = items.filter((item) => {
            return item.expanded;
        });

        const target = (
            candidates.length ? candidates : items
        ).reduce((largest, item) => {
            return item.height > largest.height
                ? item
                : largest;
        });

        const headerHeight = readNumber(
            getComputedStyle(container)
                .getPropertyValue(
                    "--ui-pane-header-height"
                ),
            0
        );

        const correctedHeight = Math.max(
            headerHeight,
            target.height - overflow
        );

        const appliedOverflow =
            target.height - correctedHeight;

        const targetBottom =
            target.top + target.height;

        for (const item of items) {
            let correctedTop = item.top;
            let height = item.height;
            let viewOverflow = 0;

            if (item === target) {
                height = correctedHeight;
                viewOverflow = appliedOverflow;
            } else if (
                item.top >= targetBottom - 0.5
            ) {
                correctedTop -= appliedOverflow;
            }

            setVariable(
                item.view,
                "--ui-sidebar-view-top",
                correctedTop
            );
            setVariable(
                item.view,
                "--ui-sidebar-view-height",
                height
            );
            setVariable(
                item.view,
                "--ui-sidebar-view-overflow",
                viewOverflow
            );
        }
    }

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            updateContainer(entry.target);
        }
    });

    const viewObserver = new MutationObserver((entries) => {
        const containers = new Set();

        for (const entry of entries) {
            const container = entry.target.closest(
                containerSelector
            );

            if (container) {
                containers.add(container);
            }
        }

        for (const container of containers) {
            updateContainer(container);
        }
    });

    function observeContainer(container) {
        if (!observedContainers.has(container)) {
            observedContainers.add(container);
            resizeObserver.observe(container);
        }

        const views = [...container.children].filter((view) => {
            return view.classList.contains(
                "split-view-view"
            );
        });

        for (const view of views) {
            if (!observedViews.has(view)) {
                observedViews.add(view);

                viewObserver.observe(view, {
                    attributes: true,
                    attributeFilter: [
                        "class",
                        "style"
                    ]
                });
            }

            const toggle = view.querySelector(
                ":scope > .pane " +
                "> .pane-header[aria-expanded]"
            );

            if (
                toggle &&
                !observedToggles.has(toggle)
            ) {
                observedToggles.add(toggle);

                viewObserver.observe(toggle, {
                    attributes: true,
                    attributeFilter: [
                        "aria-expanded"
                    ]
                });
            }
        }

        updateContainer(container);
    }

    function scanContainers() {
        document.querySelectorAll(
            containerSelector
        ).forEach(observeContainer);
    }

    function start() {
        const treeObserver =
            new MutationObserver(scanContainers);

        treeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        scanContainers();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();

(() => {
    window.__uiRemoveLineWheel?.();

    const forwardedEvents = new WeakSet();
    const linesPerWheelNotch = 3;
    const nativeEditorPixelsPerNotch = 50;

    function getLineHeight(editor) {
        const line = editor.querySelector(
            ".margin-view-overlays .line-numbers"
        );

        return line?.getBoundingClientRect().height || 0;
    }

    function handleWheel(event) {
        if (
            forwardedEvents.has(event) ||
            event.deltaY === 0 ||
            event.ctrlKey ||
            event.metaKey ||
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ) {
            return;
        }

        const target = event.target instanceof Element
            ? event.target
            : event.target?.parentElement;

        const editor = target?.closest(
            ".part.editor .monaco-editor"
        );

        if (!editor) {
            return;
        }

        const lineHeight = getLineHeight(editor);

        if (!lineHeight) {
            return;
        }

        const scale =
            lineHeight *
            linesPerWheelNotch /
            nativeEditorPixelsPerNotch;

        const forwardedEvent = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            deltaMode: event.deltaMode,
            deltaX: event.deltaX,
            deltaY: -event.deltaY * scale,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });

        forwardedEvents.add(forwardedEvent);

        event.preventDefault();
        event.stopImmediatePropagation();
        target.dispatchEvent(forwardedEvent);
    }

    document.addEventListener("wheel", handleWheel, {
        capture: true,
        passive: false
    });

    window.__uiRemoveLineWheel = () => {
        document.removeEventListener(
            "wheel",
            handleWheel,
            true
        );

        delete window.__uiRemoveLineWheel;
    };
})();

(() => {
    window.__uiRemoveEditorThumbSystem?.();
    window.__uiRemoveThumbLineDrag?.();
    window.__uiRemoveEditorThumbMinimum?.();

    const barSelector =
        ".monaco-workbench .part.editor " +
        ".monaco-editor .scrollbar.vertical";

    const thumbSelector =
        `${barSelector} > .slider`;

    const wheelUnitsPerNotch = 120;
    const linesPerWheelNotch = 3;
    const maximumCalibrationLines = 32;

    const observedThumbs = new Set();

    let drag = null;

    function getTarget(event) {
        return event.target instanceof Element
            ? event.target
            : event.target?.parentElement;
    }

    function readPixels(style, name, fallback = 0) {
        const value = Number.parseFloat(
            style.getPropertyValue(name)
        );

        return Number.isFinite(value)
            ? value
            : fallback;
    }

    function readInlinePixels(element, name, fallback) {
        const value = Number.parseFloat(
            element.style.getPropertyValue(name)
        );

        return Number.isFinite(value)
            ? value
            : fallback;
    }

    function writePixels(element, name, value) {
        const rounded = Math.round(value * 1000) / 1000;
        const text = `${rounded}px`;

        if (element.style.getPropertyValue(name) !== text) {
            element.style.setProperty(name, text);
        }
    }

    function getLineHeight(editor) {
        const line = editor.querySelector(
            ".margin-view-overlays .line-numbers"
        );

        return line?.getBoundingClientRect().height || 0;
    }

    function getThumbMetrics(thumb) {
        const bar = thumb.parentElement;

        if (!bar) {
            return null;
        }

        const style = getComputedStyle(thumb);
        const barRect = bar.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();

        if (!barRect.height || !thumbRect.height) {
            return null;
        }

        const logicalBarHeight = readInlinePixels(
            bar,
            "height",
            barRect.height
        );

        const logicalThumbHeight = readInlinePixels(
            thumb,
            "height",
            thumbRect.height
        );

        const logicalTravel = Math.max(
            0,
            logicalBarHeight - logicalThumbHeight
        );

        const logicalTop = Math.max(
            0,
            Math.min(
                logicalTravel,
                thumbRect.top - barRect.top
            )
        );

        const progress = logicalTravel > 0
            ? logicalTop / logicalTravel
            : 0;

        const trackTopGap = readPixels(
            style,
            "--ui-scrollbar-track-top-gap"
        );

        const trackBottomGap = readPixels(
            style,
            "--ui-scrollbar-track-bottom-gap"
        );

        const thumbTopGap = readPixels(
            style,
            "--ui-scrollbar-thumb-top-gap"
        );

        const thumbBottomGap = readPixels(
            style,
            "--ui-scrollbar-thumb-bottom-gap"
        );

        const editorBottomGap = readPixels(
            style,
            "--ui-gap"
        );

        const minimumHeight = readPixels(
            style,
            "--ui-scrollbar-thumb-min-height",
            40
        );

        const visualTrackTop =
            barRect.top +
            trackTopGap +
            thumbTopGap;

        const visualTrackBottom =
            barRect.bottom -
            editorBottomGap -
            trackBottomGap -
            thumbBottomGap;

        const visualTrackHeight = Math.max(
            0,
            visualTrackBottom - visualTrackTop
        );

        const naturalVisualHeight = Math.max(
            0,
            logicalThumbHeight -
            trackTopGap -
            thumbTopGap -
            editorBottomGap -
            trackBottomGap -
            thumbBottomGap
        );

        const visualHeight = Math.min(
            visualTrackHeight,
            Math.max(
                minimumHeight,
                naturalVisualHeight
            )
        );

        const visualTravel = Math.max(
            0,
            visualTrackHeight - visualHeight
        );

        const absoluteVisualTop =
            visualTrackTop + progress * visualTravel;

        return {
            bar,
            barRect,
            thumbRect,
            logicalBarHeight,
            logicalThumbHeight,
            logicalTravel,
            logicalTop,
            progress,
            visualTrackTop,
            visualTrackBottom,
            visualTrackHeight,
            visualHeight,
            visualTravel,
            absoluteVisualTop,
            relativeVisualTop:
                absoluteVisualTop - thumbRect.top
        };
    }

    function updateThumb(thumb) {
        if (!thumb.isConnected) {
            return;
        }

        const metrics = getThumbMetrics(thumb);

        if (!metrics) {
            return;
        }

        writePixels(
            thumb,
            "--ui-editor-scrollbar-thumb-visual-top",
            metrics.relativeVisualTop
        );

        writePixels(
            thumb,
            "--ui-editor-scrollbar-thumb-visual-height",
            metrics.visualHeight
        );

        if (
            thumb.style.getPropertyValue(
                "--ui-editor-scrollbar-thumb-visual-bottom"
            ) !== "auto"
        ) {
            thumb.style.setProperty(
                "--ui-editor-scrollbar-thumb-visual-bottom",
                "auto"
            );
        }
    }

    function scrollByLines(editor, lineCount) {
        if (!lineCount) {
            return;
        }

        const viewport = editor.querySelector(
            ".monaco-scrollable-element.editor-scrollable"
        );

        if (!viewport) {
            return;
        }

        viewport.dispatchEvent(new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            deltaMode: WheelEvent.DOM_DELTA_PIXEL,
            deltaY:
                lineCount /
                linesPerWheelNotch *
                wheelUnitsPerNotch
        }));
    }

    function snapToNearestLine(editor, lineHeight) {
        const viewport = editor.querySelector(
            ".monaco-scrollable-element.editor-scrollable"
        );

        if (!viewport) {
            return false;
        }

        const viewportTop =
            viewport.getBoundingClientRect().top;

        const lines = [
            ...editor.querySelectorAll(
                ".margin-view-overlays .line-numbers"
            )
        ].filter((line) => {
            return line.closest(".monaco-editor") === editor;
        });

        let closestOffset = null;

        for (const line of lines) {
            const rect = line.getBoundingClientRect();

            if (!rect.height) {
                continue;
            }

            const offset = rect.top - viewportTop;

            if (
                closestOffset === null ||
                Math.abs(offset) < Math.abs(closestOffset)
            ) {
                closestOffset = offset;
            }
        }

        if (
            closestOffset === null ||
            Math.abs(closestOffset) > lineHeight / 2 + 1
        ) {
            return false;
        }

        if (Math.abs(closestOffset) >= 0.25) {
            scrollByLines(
                editor,
                closestOffset / lineHeight
            );
        }

        return true;
    }

    function cancelDragging(state) {
        if (drag === state) {
            drag = null;
        }

        if (state.initializationFrame) {
            cancelAnimationFrame(
                state.initializationFrame
            );
        }

        if (state.refinementFrame) {
            cancelAnimationFrame(
                state.refinementFrame
            );
        }

        state.thumb.classList.remove("active");

        if (
            state.captureElement.hasPointerCapture?.(
                state.pointerId
            )
        ) {
            state.captureElement.releasePointerCapture(
                state.pointerId
            );
        }
    }
    
        function updateDraggingScale(state) {
        if (
            !state.originMetrics ||
            !state.appliedLines
        ) {
            return false;
        }

        const metrics =
            getThumbMetrics(state.thumb);

        if (!metrics) {
            return false;
        }

        const measuredLines = Math.abs(
            state.appliedLines
        );

        const measuredPixels = Math.abs(
            metrics.logicalTop -
            state.originMetrics.logicalTop
        );

        if (
            measuredLines <
                maximumCalibrationLines &&
            measuredPixels < 8
        ) {
            return false;
        }

        if (measuredPixels <= 0) {
            return false;
        }

        const logicalThumbPixelsPerLine =
            measuredPixels / measuredLines;

        const pointerPixelsPerLine =
            logicalThumbPixelsPerLine *
            state.originMetrics.visualTravel /
            state.originMetrics.logicalTravel;

        if (
            !Number.isFinite(
                pointerPixelsPerLine
            ) ||
            pointerPixelsPerLine <= 0
        ) {
            return false;
        }

        state.logicalThumbPixelsPerLine =
            logicalThumbPixelsPerLine;

        state.thumbPixelsPerLine =
            pointerPixelsPerLine;

        state.minimumLines = Math.floor(
            -state.originMetrics.logicalTop /
            logicalThumbPixelsPerLine
        );

        state.maximumLines = Math.ceil(
            (
                state.originMetrics.logicalTravel -
                state.originMetrics.logicalTop
            ) /
            logicalThumbPixelsPerLine
        );

        return true;
    }


    function applyPointerPosition(state) {
        if (drag !== state || !state.ready) {
            return;
        }

        if (!state.refinementFrame) {
            updateDraggingScale(state);
        }

        const pointerDifference =
            state.latestPointerY -
            state.startPointerY;

        const requestedLines = Math.round(
            pointerDifference /
            state.thumbPixelsPerLine
        );

        const boundedLines = Math.max(
            state.minimumLines,
            Math.min(
                state.maximumLines,
                requestedLines
            )
        );

        const lineDifference =
            boundedLines - state.appliedLines;

        if (!lineDifference) {
            return;
        }

        state.appliedLines = boundedLines;

        scrollByLines(
            state.editor,
            lineDifference
        );

        if (!state.refinementFrame) {
            state.refinementFrame =
                requestAnimationFrame(() => {
                    state.refinementFrame = 0;

                    if (drag !== state) {
                        return;
                    }

                    updateDraggingScale(state);
                    applyPointerPosition(state);
                });
        }
    }

    function configureDragging(
        state,
        logicalThumbPixelsPerLine,
        originMetrics,
        alreadyAppliedLines
    ) {
        if (drag !== state) {
            return;
        }

        updateThumb(state.thumb);

        const metrics = originMetrics;

        if (
            !metrics ||
            !Number.isFinite(logicalThumbPixelsPerLine) ||
            logicalThumbPixelsPerLine <= 0 ||
            metrics.logicalTravel <= 0 ||
            metrics.visualTravel <= 0
        ) {
            cancelDragging(state);
            return;
        }

        const pointerPixelsPerLine =
            logicalThumbPixelsPerLine *
            metrics.visualTravel /
            metrics.logicalTravel;

        if (
            !Number.isFinite(pointerPixelsPerLine) ||
            pointerPixelsPerLine <= 0
        ) {
            cancelDragging(state);
            return;
        }

        state.thumbPixelsPerLine =
            pointerPixelsPerLine;

        state.logicalThumbPixelsPerLine =
            logicalThumbPixelsPerLine;

        state.originMetrics = metrics;

        state.appliedLines =
            alreadyAppliedLines;

        state.minimumLines = Math.floor(
            -metrics.logicalTop /
            logicalThumbPixelsPerLine
        );

        state.maximumLines = Math.ceil(
            (
                metrics.logicalTravel -
                metrics.logicalTop
            ) /
            logicalThumbPixelsPerLine
        );

        state.ready = true;
        state.calibrating = false;

        applyPointerPosition(state);
    }

    function initializeDragging(state) {
        if (drag !== state || state.ready) {
            return;
        }

        const lineHeight =
            getLineHeight(state.editor);

        const metrics =
            getThumbMetrics(state.thumb);

        if (!lineHeight || !metrics) {
            cancelDragging(state);
            return;
        }

        const approximatePixelsPerLine =
            lineHeight *
            metrics.logicalThumbHeight /
            metrics.logicalBarHeight;

        if (approximatePixelsPerLine <= 0) {
            cancelDragging(state);
            return;
        }

        configureDragging(
            state,
            approximatePixelsPerLine,
            metrics,
            0
        );
    }

    function scheduleInitialization(state) {
        let attempts = 0;

        function prepareDragging() {
            if (drag !== state) {
                return;
            }

            const lineHeight =
                getLineHeight(state.editor);

            const layoutIsReady =
                Boolean(lineHeight) &&
                snapToNearestLine(
                    state.editor,
                    lineHeight
                );

            if (
                !layoutIsReady &&
                attempts < 8
            ) {
                attempts += 1;

                state.initializationFrame =
                    requestAnimationFrame(
                        prepareDragging
                    );

                return;
            }

            if (!layoutIsReady) {
                cancelDragging(state);
                return;
            }

            state.initializationFrame = 0;
            state.prepared = true;

            const pointerDifference =
                state.latestPointerY -
                state.startPointerY;

            if (
                Math.abs(
                    pointerDifference
                ) >= 0.5
            ) {
                initializeDragging(
                    state,
                    Math.sign(
                        pointerDifference
                    )
                );
            }
        }

        state.initializationFrame =
            requestAnimationFrame(
                prepareDragging
            );
    }

    function handlePointerDown(event) {
        if (event.button !== 0) {
            return;
        }

        const target = getTarget(event);
        const bar = target?.closest(barSelector);

        if (!bar) {
            return;
        }

        const thumb = bar.querySelector(
            ":scope > .slider"
        );

        if (!thumb) {
            return;
        }

        updateThumb(thumb);

        const metrics = getThumbMetrics(thumb);

        if (!metrics) {
            return;
        }

        const pointerIsOverThumb =
            event.clientY >= metrics.absoluteVisualTop &&
            event.clientY <=
                metrics.absoluteVisualTop +
                metrics.visualHeight;

        if (!pointerIsOverThumb) {
            return;
        }

        const editor = bar.closest(".monaco-editor");
        const lineHeight = getLineHeight(editor);

        if (!editor || !lineHeight) {
            return;
        }

        if (drag) {
            cancelDragging(drag);
        }

        const state = {
            pointerId: event.pointerId,
            captureElement: bar,
            thumb,
            editor,
            latestPointerY: event.clientY,
            startPointerY: event.clientY,
            thumbPixelsPerLine: 0,
            appliedLines: 0,
            minimumLines: 0,
            maximumLines: 0,
            initializationFrame: 0,
            refinementFrame: 0,
            logicalThumbPixelsPerLine: 0,
            originMetrics: null,
            ready: false
        };

        drag = state;

        thumb.classList.add("active");
        bar.setPointerCapture?.(event.pointerId);

        scheduleInitialization(state);

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function blockNativeMouseDown(event) {
        if (!drag) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function handlePointerMove(event) {
        if (
            !drag ||
            event.pointerId !== drag.pointerId
        ) {
            return;
        }

        drag.latestPointerY = event.clientY;

        if (drag.ready) {
            applyPointerPosition(drag);
        } else if (
            drag.prepared &&
            !drag.calibrating
        ) {
            const pointerDifference =
                event.clientY -
                drag.startPointerY;

            if (
                Math.abs(pointerDifference) >= 0.5
            ) {
                initializeDragging(
                    drag,
                    Math.sign(pointerDifference)
                );
            }
        }

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function finishDragging(event) {
        if (
            !drag ||
            event.pointerId !== drag.pointerId
        ) {
            return;
        }

        const state = drag;
        cancelDragging(state);

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    const resizeObserver = new ResizeObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.target.matches?.(thumbSelector)) {
                    updateThumb(entry.target);
                    continue;
                }

                const thumb = entry.target.querySelector?.(
                    ":scope > .slider"
                );

                if (thumb?.matches(thumbSelector)) {
                    updateThumb(thumb);
                }
            }
        }
    );

    function observeThumb(thumb) {
        if (observedThumbs.has(thumb)) {
            return;
        }

        observedThumbs.add(thumb);
        resizeObserver.observe(thumb);

        if (thumb.parentElement) {
            resizeObserver.observe(thumb.parentElement);
        }

        updateThumb(thumb);
    }

    function scanThumbs() {
        document.querySelectorAll(
            thumbSelector
        ).forEach(observeThumb);
    }

    const mutationObserver = new MutationObserver(
        (entries) => {
            let mustScan = false;

            for (const entry of entries) {
                if (entry.type === "childList") {
                    mustScan = true;
                    continue;
                }

                if (entry.target.matches?.(thumbSelector)) {
                    updateThumb(entry.target);
                }
            }

            if (mustScan) {
                scanThumbs();
            }
        }
    );

    function start() {
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style"]
        });

        scanThumbs();
    }

    document.addEventListener(
        "pointerdown",
        handlePointerDown,
        {
            capture: true,
            passive: false
        }
    );

    document.addEventListener(
        "mousedown",
        blockNativeMouseDown,
        {
            capture: true,
            passive: false
        }
    );

    document.addEventListener(
        "pointermove",
        handlePointerMove,
        {
            capture: true,
            passive: false
        }
    );

    document.addEventListener(
        "pointerup",
        finishDragging,
        {
            capture: true,
            passive: false
        }
    );

    document.addEventListener(
        "pointercancel",
        finishDragging,
        {
            capture: true,
            passive: false
        }
    );

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }

    window.__uiRemoveEditorThumbSystem = () => {
        document.removeEventListener(
            "pointerdown",
            handlePointerDown,
            true
        );

        document.removeEventListener(
            "mousedown",
            blockNativeMouseDown,
            true
        );

        document.removeEventListener(
            "pointermove",
            handlePointerMove,
            true
        );

        document.removeEventListener(
            "pointerup",
            finishDragging,
            true
        );

        document.removeEventListener(
            "pointercancel",
            finishDragging,
            true
        );

        mutationObserver.disconnect();
        resizeObserver.disconnect();

        if (drag) {
            cancelDragging(drag);
        }

        for (const thumb of observedThumbs) {
            thumb.style.removeProperty(
                "--ui-editor-scrollbar-thumb-visual-top"
            );

            thumb.style.removeProperty(
                "--ui-editor-scrollbar-thumb-visual-height"
            );

            thumb.style.removeProperty(
                "--ui-editor-scrollbar-thumb-visual-bottom"
            );
        }

        observedThumbs.clear();

        delete window.__uiRemoveEditorThumbSystem;
    };
})();


// Settings
const tag_when_done = false; // handy, but counts as a draft modification
const silent = draft.processTemplate("[[silent]]") === "true";

// Script
function export_title(dft) {
    let safe_title = dft.processTemplate('[[safe_title]]').trim();
    let uuid8 = dft.processTemplate('[[uuid]]').substring(0, 8).toUpperCase();
    if (!safe_title) {
        return uuid8;
    }
    let words = safe_title.split(/\s+/).slice(0, 4).join('-').toLowerCase().replace(/^\.+/, '');
    if (!words) {
        return uuid8;
    }
    return words + '-' + uuid8;
}

if (app.currentWindow.isDraftListVisible) {
    let bk = Bookmark.findOrCreate("Export pit")
    let fmBk = FileManager.createForBookmark(bk);

    let lastExport = null;
    if (fmBk.exists(".export-metadata.json")) {
        let meta = JSON.parse(fmBk.readString(".export-metadata.json"));
        if (meta.lastExport) {
            lastExport = new Date(meta.lastExport);
        }
    }
    let cutoff = lastExport || new Date(0);
    let draftsGroup = app.currentWorkspace.query("inbox").filter(function(dft) {
        return dft.modifiedAt >= cutoff;
    });

    let proceed = true;
    if (!silent) {
        let previewCount = Math.min(draftsGroup.length, 5);
        let previewTitles = draftsGroup.slice(0, previewCount).map(function(dft) {
            return "  · " + export_title(dft);
        }).join("\n");
        let more = draftsGroup.length > previewCount ? "\n  … and " + (draftsGroup.length - previewCount) + " more" : "";

        let p = Prompt.create();
        p.title = "Export " + draftsGroup.length + " draft" + (draftsGroup.length === 1 ? "" : "s") + "?";
        p.message = previewTitles + more + "\n\n⌘ enter to approve; space to cancel.";
        p.addButton("Export", undefined, true);
        p.isCancellable = true;
        proceed = p.show();
    }

    if (proceed) {
        let startTime = new Date();
        console.log("Export started at " + startTime.toLocaleString());
        console.log("Drafts to process: " + draftsGroup.length);

        let filesBefore = fmBk.listContents("/").filter(function(f) {
            return /[0-9A-F]{8}\.md$/i.test(f);
        }).length;

        export_tag = "exported-" + Date.now()
        let written = 0;
        draftsGroup.forEach(function(dft) {
            title = export_title(dft);
            filename = title + '.md';

            fmBk.writeString(filename, dft.content);
            fmBk.setCreationDate(filename, dft.createdAt);
            fmBk.setModificationDate(filename, dft.modifiedAt);
            written++;

            if (tag_when_done) {
                dft.addTag(export_tag);
                dft.update();
            }
        });

        let endTime = new Date();
        let elapsedSec = Math.round((endTime - startTime) / 1000);
        let elapsedMin = Math.floor(elapsedSec / 60);
        let remainSec = elapsedSec % 60;
        let elapsed = elapsedMin > 0 ? elapsedMin + "m " + remainSec + "s" : elapsedSec + "s";

        let inboxCount = Draft.query("", "inbox").length;
        let allCount = inboxCount + Draft.query("", "flagged").length + Draft.query("", "archive").length;
        let filesAfter = fmBk.listContents("/").filter(function(f) {
            return /[0-9A-F]{8}\.md$/i.test(f);
        }).length;
        let netNew = filesAfter - filesBefore;

        let counts = "📁 " + filesBefore + " files before + " + written + " written ≥ " + filesAfter + " files now\n📓 " + inboxCount + " inbox · " + allCount + " total drafts";
        let warnings = [];
        if (filesAfter === 0 && written > 0) {
            warnings.push("🚨 No files detected — check bookmark path");
        }
        if (filesAfter < filesBefore) {
            warnings.push("🚨 Files disappeared during export");
        }
        if (netNew > written) {
            warnings.push("🚨 More new files than written — unexpected files in directory");
        }
        if (filesBefore === 0 && filesAfter < written * 0.999) {
            warnings.push("🚨 Fresh export but far fewer files than written");
        }
        if (filesAfter > allCount) {
            warnings.push("🚨 More files than drafts — possible stale exports");
        }
        if (filesAfter < inboxCount * 0.999) {
            warnings.push("🚨 Files below inbox count — some drafts may not have exported");
        }
        let warning = warnings.length > 0 ? "\n" + warnings.join("\n") : "\n✅ Counts look plausible";

        let summary = counts + warning + "\n\n⏱ " + elapsed + " elapsed";
        console.log(summary);
        console.log("Export finished at " + endTime.toLocaleString());

        let metadata = {
            lastExport: endTime.toISOString(),
            draftsProcessed: draftsGroup.length,
            written: written,
            elapsedSeconds: elapsedSec
        };
        fmBk.writeString(".export-metadata.json", JSON.stringify(metadata, null, 2));

        if (!silent) {
            app.displayInfoMessage(summary);

            let done = Prompt.create();
            done.title = "Exported " + written + " draft" + (written === 1 ? "" : "s");
            done.message = summary;
            done.addButton("OK", undefined, true);
            done.show();
        }
    } else {
        context.cancel("User canceled");
    }

} else {
    context.cancel("Draft list is not visible. Aborting for safety.");
}

script.complete();
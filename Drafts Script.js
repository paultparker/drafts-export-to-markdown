// Settings
const tag_when_done = false; // handy, but counts as a draft modification

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

    // Get the ok
    let subsetLength = Math.min(draftsGroup.length, 10);
    let subset = draftsGroup.slice(0, subsetLength);
    let subset_titles = subset.map(function(dft) {
        return export_title(dft);
    });
    let preview_titles = subset_titles.join("\n")

    let p = Prompt.create();
    p.title = "Export confirmation";
    p.message = "About to export " + draftsGroup.length + " draft(s). Titles include: \n\n" + preview_titles;
    p.addButton("Export");
    p.isCancellable = true;

    let proceed = p.show();

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

        let counts = "📁 " + filesBefore + " before + " + netNew + " new ≥ " + filesAfter + " files · " + inboxCount + " inbox · " + allCount + " total drafts";
        let warning = "";
        if (filesAfter === 0 && written > 0) {
            warning = "\n⚠ No files detected — check bookmark path";
        } else if (filesAfter > allCount) {
            warning = "\n⚠ More files than drafts — possible stale exports";
        } else if (filesAfter < inboxCount * 0.999) {
            warning = "\n⚠ Files below inbox count — some drafts may not have exported";
        } else {
            warning = "\n✅ Counts look plausible";
        }

        let summary = "Exported " + written + " draft(s) in " + elapsed + "\n" + counts + warning;
        console.log(summary);
        console.log("Export finished at " + endTime.toLocaleString());

        let metadata = {
            lastExport: endTime.toISOString(),
            draftsProcessed: draftsGroup.length,
            written: written,
            elapsedSeconds: elapsedSec
        };
        fmBk.writeString(".export-metadata.json", JSON.stringify(metadata, null, 2));

        app.displayInfoMessage(summary);

        let done = Prompt.create();
        done.title = "Export complete";
        done.message = summary;
        done.addButton("OK");
        done.show();
    } else {
        context.cancel("User canceled");
    }

} else {
    context.cancel("Draft list is not visible. Aborting for safety.");
}

script.complete();
// Settings
const tag_when_done = false; // handy, but counts as a draft modification

// Script
function export_title(dft) {
    let safe_title = dft.processTemplate('[[safe_title]]').trim();
    let uuid8 = dft.processTemplate('[[uuid]]').substring(0, 8).toUpperCase();
    if (!safe_title) {
        return uuid8;
    }
    let words = safe_title.split(/\s+/).slice(0, 4).join('-').toLowerCase();
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

        let allDrafts = Draft.query("", "inbox").concat(Draft.query("", "flagged"), Draft.query("", "archive"));
        let uuidPattern = /[0-9A-F]{8}\.md$/i;
        let files = fmBk.listContents("/").filter(function(f) {
            return uuidPattern.test(f);
        });
        let countWarning = "";
        if (files.length !== allDrafts.length) {
            countWarning = "\n⚠ File count (" + files.length + ") ≠ draft count (" + allDrafts.length + ")";
        }

        let summary = "Exported " + written + " draft(s).\nElapsed: " + elapsed + countWarning;
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
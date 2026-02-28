// Settings
const tag_when_done = false; // handy, but counts as a draft modification
const max_title_length = 190;
const prefix_iso_date = true;

// Script
function export_title(dft) {
    let iso_date = prefix_iso_date ? dft.processTemplate('[[modified|%Y-%m-%d]] ') : "";
    let uuid_title = dft.processTemplate('[[uuid]]-[[safe_title]]');
    let max_uuid_title = max_title_length - iso_date.length - 3; // 3 for ".md"
    if (uuid_title.length > max_uuid_title) {
        uuid_title = uuid_title.substring(0, max_uuid_title);
    }
    return iso_date + uuid_title;
}

if (app.currentWindow.isDraftListVisible) {
    let bk = Bookmark.findOrCreate("Export pit")
    let fmBk = FileManager.createForBookmark(bk);

    let sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    let draftsGroup = app.currentWorkspace.query("inbox").filter(function(dft) {
        return dft.modifiedAt >= sixMonthsAgo;
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
        let written = 0, skipped = 0;
        draftsGroup.forEach(function(dft) {
            title = export_title(dft);
            filename = title + '.md';

            if (fmBk.exists(filename)) {
                let fileModDate = fmBk.getModificationDate(filename);
                let draftSec = Math.floor(dft.modifiedAt.getTime() / 1000);
                let fileSec = Math.floor(fileModDate.getTime() / 1000);
                if (draftSec <= fileSec) {
                    skipped++;
                    return;
                }
            }

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
        let uuidPattern = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i;
        let files = fmBk.listContents("/").filter(function(f) {
            return f.endsWith(".md") && uuidPattern.test(f);
        });
        let countWarning = "";
        if (files.length !== allDrafts.length) {
            countWarning = "\n⚠ File count (" + files.length + ") ≠ draft count (" + allDrafts.length + ")";
        }

        let summary = "Exported " + written + " draft(s), skipped " + skipped + " unchanged.\nElapsed: " + elapsed + countWarning;
        console.log(summary);
        console.log("Export finished at " + endTime.toLocaleString());

        let metadata = {
            lastExport: endTime.toISOString(),
            draftsProcessed: draftsGroup.length,
            written: written,
            skipped: skipped,
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
// Settings
const tag_when_done = false; // handy, but counts as a draft modification
const max_title_length = 190;
const prefix_iso_date = true;

// Script
function export_title(dft) {
    iso_date = prefix_iso_date ? dft.processTemplate('[[modified|%Y-%m-%d]] ') : "";
    return iso_date + dft.processTemplate('[[uuid]]-[[safe_title]]');
}

if (app.isDraftListVisible) {
    let bk = Bookmark.findOrCreate("Export pit")
    let fmBk = FileManager.createForBookmark(bk);

    let draftsGroup = app.currentWorkspace.query("inbox");

    overlong_titles = [];
    draftsGroup.forEach(function(dft) {
        title = dft.processTemplate('[[uuid]]-[[safe_title]]');

        if (title.length > max_title_length) {
            console.log("Overlong title: " + title);
            overlong_titles.push(draft);
        }
    });

    overlong_count = overlong_titles.length

	max_overlong_titles = 2000

	// Warn user
    let p = Prompt.create();
    p.title = "Export confirmation";
	p.message = "About to export " + draftsGroup.length + " draft(s). Cannot export overlong draft count:" + overlong_count ;
	p.addButton("Export");
	p.isCancellable = true;

	let proceed = p.show();

    if (overlong_count < max_overlong_titles) {
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
                    if (dft.modifiedAt <= fileModDate) {
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

            let summary = "Exported " + written + " draft(s), skipped " + skipped + " unchanged.\nElapsed: " + elapsed;
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
        app.displayErrorMessage("Overlong titles: " + overlong_count + ". See Action Log for list.");
        context.fail("Overlong titles found.");
    }

} else {
    context.cancel("Draft list is not visible. Aborting for safety.");
}

script.complete();
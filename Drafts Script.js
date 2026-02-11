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
            export_tag = "exported-" + Date.now()
            draftsGroup.forEach(function(dft) {
                title = export_title(dft);
                filename = title + '.md';
                fmBk.writeString(filename, dft.content);
                fmBk.setCreationDate(filename, dft.createdAt);
                fmBk.setModificationDate(filename, dft.modifiedAt);
                if (tag_when_done) {
                    dft.addTag(export_tag);
                    dft.update();
                }
            });
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
# Change colours

## In your code
1. Open `public/assets/css/colours.css`. This is the final palette used by every page.
2. Change `--bg` for the hero/body, `--section-bg` for selected projects, `--contact-bg` for contact, `--footer-bg` for footer, `--accent` for buttons and lines, or `--hover-bg` for hover.
3. In admin, open each page and choose **Colours & styling → Where colours come from → CSS file**. Save. This ignores saved colour overrides independently of the HTML content dropdown.
4. Refresh the website. For deployment, deploy the edited files too.

## In admin
Open Home (or another page), find **Colours & styling**, select **Admin colours**, choose colours using the picker or a six-digit hex code, and save. Open Preview and refresh. Palette changes apply to the selected page. Select a section for its own background/text/spacing overrides. Use **Reset all saved colours on this page** to remove overrides and return to the CSS palette.

The HTML content dropdown controls words and images. The styling dropdown controls colours; they are independent. Existing saved section backgrounds override the page palette until reset. No database reinitialisation is needed.

## More styling controls
Colours & styling now includes project card backgrounds, title/description/category/link colours, headings, navigation, footer, primary/light/hover buttons, inputs, placeholders, skills, case studies and back-to-top. Expand Typography, cards & spacing for font size/weight, card padding/corners/borders, gaps, section spacing and image corners. Each page saves its own styling. Section overrides still win; reset them if the page palette appears ineffective. Mockup frame backgrounds are transparent. A background baked into an uploaded image requires an image edit; CSS cannot remove its pixels.

-- Pin The Stranger to the edition the organizer picked on Amazon: Vintage
-- International, Matthew Ward translation (Vintage, March 13, 1989).
-- The record was completely bare before this, author included.
--
-- Verified, not guessed:
--   * ISBN-10 0679720200 from the /dp/ segment of the organizer's link. Note
--     Amazon's own product page mislabels the 13-digit number as "ISBN-10";
--     the ISBN-13 9780679720201 round-trips to 0679720200 through the app's
--     tested isbn13to10().
--   * 144 pages, read off the Amazon product details.
--   * Cover fetched at both sizes and checked by eye: the black-and-white
--     sunburst Vintage International jacket.
--   * first_publish_year is 1942, NOT 1989 (this printing) and NOT 1946 (the
--     first English translation the blurb mentions). CLAUDE.md: the year is
--     the work's original publication — L'Étranger, Gallimard, 1942.
--   * Description is the organizer's own supplied jacket copy, verbatim.

update books set
  author             = 'Albert Camus',
  isbn               = '0679720200',
  isbn13             = '9780679720201',
  cover_url          = 'https://m.media-amazon.com/images/I/71tPpl0g2ML._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/71tPpl0g2ML._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/0679720200',
  page_count         = 144,
  first_publish_year = 1942,
  description        = 'Since it was first published in English, in 1946, Albert Camus’s first novel, The Stranger (L’etranger), has had a profound impact on millions of American readers. Through this story of an ordinary man who unwittingly gets drawn into a senseless murder on a sundrenched Algerian beach, Camus explored what he termed “the nakedness of man faced with the absurd.”

Now, in this illuminating translation, extraordinary for its exactitude and clarity, the original intent of The Stranger is made more immediate. This haunting novel has been given a new life for generations to come.',
  needs_review       = false
where id = 'bkdaofwga';

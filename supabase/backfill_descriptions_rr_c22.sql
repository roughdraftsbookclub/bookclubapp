-- Descriptions for the two books pinned to organizer-chosen editions in
-- fix_editions_red_rising_catch22.sql.
--
-- Supplied by the organizer directly (2026-09-09), replacing the Open
-- Library work descriptions an earlier version of this file carried --
-- those were never run. These are the jacket copy for the exact editions
-- on the shelf, which is closer to what a member expects to read than a
-- work-level blurb aggregated across every printing.

update books set description = 'Darrow is a Red, a member of the lowest caste in the color-coded society of the future. Like his fellow Reds, he works all day, believing that he and his people are making the surface of Mars livable for future generations. Yet he spends his life willingly, knowing that his blood and sweat will one day result in a better world for his children. But Darrow and his kind have been betrayed. Soon he discovers that humanity reached the surface generations ago. Vast cities and sprawling parks spread across the planet.

Darrow - and Reds like him - are nothing more than slaves to a decadent ruling class. Inspired by a longing for justice, and driven by the memory of lost love, Darrow sacrifices everything to infiltrate the legendary Institute, a proving ground for the dominant Gold caste, where the next generation of humanity''s overlords struggle for power. He will be forced to compete for his life and the very future of civilization against the best and most brutal of Society''s ruling class. There, he will stop at nothing to bring down his enemies...even if it means he has to become one of them to do so.' where id = 'bk8u0zhia';   -- Red Rising

update books set description = 'Set in Italy during World War II, this is the story of the incomparable, malingering bombardier, Yossarian, a hero who is furious because thousands of people he has never met are trying to kill him. But his real problem is not the enemy—it is his own army, which keeps increasing the number of missions the men must fly to complete their service. Yet if Yossarian makes any attempt to excuse himself from the perilous missions he’s assigned, he’ll be in violation of Catch-22, a hilariously sinister bureaucratic rule: a man is considered insane if he willingly continues to fly dangerous combat missions, but if he makes a formal request to be removed from duty, he is proven sane and therefore ineligible to be relieved.' where id = 'bkbw12juh';   -- Catch-22

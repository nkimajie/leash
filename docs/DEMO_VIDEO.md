# Demo video script (2:45)

Rules from the hackathon: under 3 minutes, public on YouTube, no copyrighted music, show the real app working.
Record the live Render URL with real services on (the sidebar should say paypal-sandbox, claude, channel3, supabase).

**Before recording**

- Click **Reset demo**, so the screens start clean.
- Open your sandbox Personal account at sandbox.paypal.com in another tab, to show the money at the end.
- Have your phone ready, with the camera app open.

| Time      | On screen                                                                                                      | Say                                                                                                                                                                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:15 | Assistant page                                                                                                 | "AI agents can spend money now. Would you hand one your PayPal? Leash puts it on a leash: Claude decides what to buy, but code decides whether any money moves."                                                                                       |
| 0:15–0:45 | Click "Restock my coffee setup, under $60". Let the timeline play.                                             | "It recalls what I like, searches real products with Channel3, and checks my rules before each purchase. The $14 beans are within my rules, so PayPal authorizes and captures them. The $85 grinder is over my limit, so PayPal only **reserves** it." |
| 0:45–1:10 | Scan the QR code with your phone. Tap Deny, type "I only want hand grinders", Deny. Show the desktop updating. | "I get it on my phone. I say no, and why. PayPal voids the reservation, so I'm never charged. Claude turns my reason into something my twin remembers."                                                                                                |
| 1:10–1:25 | Ask "I need a coffee grinder".                                                                                 | "Next time, it picks the hand grinder and says why. It learns from every yes, no and refund."                                                                                                                                                          |
| 1:25–1:50 | Click "Try to break the leash" → "Send $900 to a stranger", then "Drain the budget".                           | "What if a scam takes over the AI? These attacks skip the AI completely. $900 to a stranger: blocked before PayPal is called. Many small buys: paid only up to my budget, then held."                                                                  |
| 1:50–2:15 | Control room. Ask "what did I spend on coffee this week?". Click a row to show the PayPal steps.               | "Everything lands in an AG Grid control room, live. I can ask it questions in plain English, and click any payment to see every PayPal step: order, authorization, capture or void."                                                                   |
| 2:15–2:30 | Rules page: "Ask me before anything over $30, and no snacks" → Suggest → Apply.                                | "I can change the rules in my own words. Claude suggests the change, and nothing is saved until I confirm. Recurring restocks always wait for my OK."                                                                                                  |
| 2:30–2:45 | Sandbox PayPal activity tab, then the architecture diagram in the README.                                      | "And it's real PayPal: Vault, Orders, authorize, capture, void and refund, in the sandbox. Leash: an assistant you can actually trust with your wallet."                                                                                               |

**Optional, if there's time:** set `DEMO_FORCE_DECLINE=true` and show a declined card with its `debug_id`.

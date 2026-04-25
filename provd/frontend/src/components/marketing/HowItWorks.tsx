import Image from "next/image";

import { AnimatedCard } from "./AnimatedCard";
import { Container } from "../ui/container";
import { Section } from "../ui/section";
import { Card, CardContent } from "../ui/card";

export default function HowItWorks() {
	return (
		<section className="py-28 bg-bg-base">
			<div className="max-w-5xl mx-auto px-4 text-center">
				<div className="font-mono text-[11px] text-accent tracking-[0.15em] mb-2">
					REQUEST LIFECYCLE
				</div>
				<h2 className="font-display text-[36px] md:text-[48px] text-text-primary mb-12">
					How a single API call changes your approval decision.
				</h2>
				<div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-bg-border">
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">01</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/query.png" alt="Query" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Ingest
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Before a trade releases, your platform sends counterparty identifiers, wallet address, hashed phone, payment rail, and trade context. Nothing raw leaves your environment.
						</div>
					</div>
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">02</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/check.png" alt="Analyse" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Evaluate
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Provd scores the counterparty against network-wide dispute history, linked identifiers, and cross-platform fraud signals, intelligence your platform alone could never generate.
						</div>
					</div>
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">03</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/rating.png" alt="Score" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Respond
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Your platform receives a precision score, reason flags, and a recommended action, so you approve the trades you should, and only hold the ones that warrant it.
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

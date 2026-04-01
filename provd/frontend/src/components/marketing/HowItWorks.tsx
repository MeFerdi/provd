import Image from "next/image";

import { AnimatedCard } from "./AnimatedCard";
import { Container } from "../ui/container";
import { Section } from "../ui/section";
import { Card, CardContent } from "../ui/card";

const steps = [
	{
		step: "Step 1",
		title: "Query",
		body: "Exchange sends wallet address + phone hash before the trade executes.",
	},
	{
		step: "Step 2",
		title: "Score",
		body: "Provd evaluates on-chain history, cross-platform behavior graphs, and fiat-rail signals.",
	},
	{
		step: "Step 3",
		title: "Act",
		body: "Receive score + flags + recommended action in under 200ms and block high-risk trades.",
	},
];

export default function HowItWorks() {
	return (
		<section className="py-28 bg-bg-base">
			<div className="max-w-5xl mx-auto px-4 text-center">
				<div className="font-mono text-[11px] text-accent tracking-[0.15em] mb-2">
					HOW IT WORKS
				</div>
				<h2 className="font-display text-[36px] md:text-[48px] text-text-primary mb-12">
					From query to decision in under 200ms.
				</h2>
				<div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-bg-border">
					{/* Step 1 */}
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">01</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/query.png" alt="Query" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Query
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Exchange sends wallet address, phone hash, and trade context before a
							transaction executes.
						</div>
					</div>
					{/* Step 2 */}
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">02</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/check.png" alt="Analyse" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Analyse
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Provd evaluates on-chain history, cross-platform behavioral graph, and
							fiat payment rail signals.
						</div>
					</div>
					{/* Step 3 */}
					<div className="flex-1 px-8 py-10">
						<div className="font-mono text-[11px] text-text-muted mb-2">03</div>
						<div className="flex items-center justify-center mb-4">
							<Image src="/assets/rating.png" alt="Score" width={48} height={48} />
						</div>
						<div className="font-sans font-medium text-[20px] text-text-primary mb-2">
							Score
						</div>
						<div className="font-sans text-[15px] text-text-secondary leading-relaxed">
							Exchange receives a trust score, risk flags, and recommended action in
							under 200ms.
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

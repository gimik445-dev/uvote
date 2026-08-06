CREATE TABLE "nominee_login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nominee_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nominee_login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "nominees" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "nominee_login_tokens" ADD CONSTRAINT "nominee_login_tokens_nominee_id_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."nominees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nominee_login_tokens_nominee_idx" ON "nominee_login_tokens" USING btree ("nominee_id");
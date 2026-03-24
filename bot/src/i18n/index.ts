// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

export type Lang = "en" | "ru";

const messages: Record<Lang, Record<string, string>> = {
  en: {
    // /start command
    "start.welcome":
      "Welcome to izEscrowAI!\n\n" +
      "I'm an AI-powered escrow agent for safe P2P deals in Telegram. " +
      "Funds are held by a smart contract on TON, not by the bot.\n\n" +
      "How to create a deal:\n" +
      "Just write something like:\n" +
      '"Selling logo design to @ivan for 50 TON"\n\n' +
      "Commands:\n" +
      "/help — list of commands\n" +
      "/wallet — connect wallet\n" +
      "/mydeals — my deals",
    "start.jobs_notice": "\n\nYou have {{count}} order(s) from Telegram groups! Open your profile to see applicants.",

    // Deep link: offer
    "start.offer_unavailable": "This offer is no longer available.",
    "start.offer_self_apply": "You can't apply to your own offer.",
    "start.offer_details":
      "Offer: {{description}}\n" +
      "Price: {{price}}\n" +
      "Applications: {{appCount}}\n\n" +
      "Enter your price:",
    "start.offer_price_negotiable": "Negotiable",
    "start.offer_price_from": "from {{min_price}} {{currency}}",

    // Deep link: deal
    "start.deal_not_found": "Deal not found or already cancelled.",
    "start.deal_already_status": "Deal #{{dealId}} is already in status: {{status}}.\nUse /mydeals to view details.",
    "start.deal_invite":
      "You've been invited to deal #{{dealId}}:\n\n" +
      "Description: {{description}}\n" +
      "Amount: {{amount}}\n\n" +
      "Accept this deal?",

    // /help command
    "help":
      "Available commands:\n\n" +
      "/start — get started\n" +
      "/help — this help\n" +
      "/wallet — connect TON wallet via Mini App\n" +
      "/mydeals — your deals list\n\n" +
      "Create a deal:\n" +
      "Write in natural language, for example:\n" +
      '• "Selling website design to @buyer for 100 TON"\n' +
      '• "Want to buy a logo from @designer for 50 TON"\n\n' +
      "The bot will recognize participants, amount, and description, then ask you to confirm.",

    // /wallet command
    "wallet.prompt": "Connect your TON wallet via Mini App:",

    // /mydeals command
    "mydeals.empty": "You have no deals yet. Create your first one!",
    "mydeals.title": "Your deals:",

    // Spec conversation
    "spec.conversation_limit": "Conversation limit reached. Please start over with /spec <description>",
    "spec.follow_up": "Follow-up questions:\n\n{{questions}}\n\nPlease answer:",
    "spec.error_input": "Error processing your input. Please try again or start over with /spec.",

    // Offer bid flow
    "bid.invalid_price": "Please enter a valid price (number).",
    "bid.enter_message": "Got it! Add a message (or send /skip to submit without one):",
    "bid.offer_unavailable": "This offer is no longer available.",
    "bid.submitted":
      "Your application submitted!\n" +
      "Price: {{price}} {{currency}}\n" +
      "{{message}}" +
      "\nThe offer creator will be notified.",
    "bid.submitted_message": "Message: {{message}}\n",
    "bid.new_application":
      "New application for your offer!\n\n" +
      "Offer: {{description}}\n" +
      "From: @{{username}} ({{trust}})\n" +
      "Price: {{price}} {{currency}}",
    "bid.new_application_message": "\nMessage: {{message}}",
    "bid.trust_new_user": "New user",

    // Off-platform payment warning
    "off_platform_warning":
      "It looks like you're discussing off-platform payment. " +
      "For your safety, we recommend using izEscrow's built-in escrow protection. " +
      "Your funds are secured by a smart contract — the seller only gets paid when you confirm delivery.\n\n" +
      "To create a safe deal, just describe it: 'Selling logo design to @username for 50 TON'",

    // Deal action fallback
    "deal_action.fallback": "Use the buttons in deal messages for actions.",

    // Spec creation (natural language)
    "spec.generating": "Generating specification...",
    "spec.clarification": "I need some clarification:\n\n{{questions}}\n\nPlease answer:",
    "spec.error_generate": "Error generating spec. Try /spec <description> instead.",

    // Pricing request
    "pricing.estimating": "Estimating price...",
    "pricing.result":
      "AI Price Estimate:\n\n{{estimate}}\n\n" +
      "This is an AI estimate based on task complexity.\n" +
      "For a detailed spec, use /spec <description>.",
    "pricing.error": "Could not estimate price. Try /spec <description> for a full analysis.",

    // Offer creation suggestion
    "offer.use_inline":
      "This looks like a public offer. Use me in inline mode to post it:\n\n" +
      "Type @{{botUsername}} {{text}}\n" +
      "in any chat to create a public offer.",

    // Deal creation — missing fields
    "deal.missing_fields":
      "Could not recognize all deal parameters.\n" +
      "Missing: {{fields}}\n\n" +
      "Try being more specific, e.g.:\n" +
      '"Selling logo design to @ivan for 50 TON"',
    "deal.missing_amount": "Could not determine the amount or description. Please try again.",

    // Deal confirmation prompt
    "deal.confirm_prompt":
      "Parsed deal:\n\n" +
      "Seller: @{{seller}} ({{sellerDeals}} deals, {{sellerRating}})\n" +
      "Buyer: @{{buyer}} ({{buyerDeals}} deals)\n" +
      "Amount: {{amount}} {{currency}}\n" +
      "Description: {{description}}\n\n" +
      "Is this correct?",
    "deal.too_many_pending": "You have too many pending deals. Please confirm or cancel existing ones first.",

    // Deal created callbacks
    "deal.data_expired": "Deal data expired. Please create the deal again.",
    "deal.created_notified":
      "Deal #{{dealId}} created!\n\n" +
      "Seller: @{{seller}}\n" +
      "Buyer: @{{buyer}}\n" +
      "Amount: {{amount}}\n" +
      "Description: {{description}}\n\n" +
      "Notification sent to @{{counterparty}}.",
    "deal.created_deep_link":
      "Deal #{{dealId}} created!\n\n" +
      "Seller: @{{seller}}\n" +
      "Buyer: @{{buyer}}\n" +
      "Amount: {{amount}}\n" +
      "Description: {{description}}\n\n" +
      "@{{counterparty}} is not in the bot yet.\n" +
      "Share this link:\n{{deepLink}}",
    "deal.new_deal_notification":
      "New deal #{{dealId}} from @{{sender}}:\n\n" +
      "Description: {{description}}\n" +
      "Amount: {{amount}}\n\n" +
      "Accept?",
    "deal.creation_error": "Error creating deal. Please try again.",
    "deal.creation_cancelled": "Deal creation cancelled.",

    // Deal confirmation by counterparty
    "deal.confirm_failed": "Could not confirm the deal.",
    "deal.confirmed_need_wallets":
      "Deal #{{dealId}} confirmed!\n\n" +
      "Both parties need to connect a TON wallet to proceed.",
    "deal.confirmed_pay":
      "Deal #{{dealId}} confirmed!\n" +
      "Contract: {{contractAddress}}\n\n" +
      "Buyer, please pay:",
    "deal.deploy_error": "Error deploying contract.",
    "deal.deploy_error_retry": "Error deploying contract. Please try later.",

    // Deal rejected
    "deal.rejected": "Deal #{{dealId}} rejected.",

    // Delivery
    "delivery.mark_failed": "Could not mark as delivered.",
    "delivery.marked":
      "Deal #{{dealId}}: seller marked as delivered.\n\n" +
      "Buyer has 7 days to confirm or open a dispute.",
    "delivery.complete_failed": "Could not complete the deal.",
    "delivery.completed":
      "Deal #{{dealId}} completed!\n" +
      "Funds sent to seller.\n\n" +
      "Rate this deal:",
    "delivery.complete_error": "Error completing the deal. Please try later.",
    "delivery.rated": "Deal #{{dealId}} completed! Rating: {{stars}}",

    // Dispute
    "dispute.open_failed": "Could not open dispute.",
    "dispute.opened_spec":
      "Deal #{{dealId}}: dispute opened.\n\n" +
      "This deal has a linked spec with {{reqCount}} requirements.\n" +
      "AI will evaluate delivery against the spec criteria.\n\n" +
      "Both parties need to submit evidence:",
    "dispute.evidence_request":
      "Dispute opened for deal #{{dealId}}.\n\n" +
      "Please describe your position and provide evidence of completion/non-completion.\n" +
      "Send your evidence as a reply:",
    "dispute.evidence_seller": "(You are the seller)",
    "dispute.evidence_buyer": "(You are the buyer)",
    "dispute.opened_no_spec":
      "Deal #{{dealId}}: dispute opened.\n\n" +
      "AI will analyze the situation and propose a resolution.",
    "dispute.mediation":
      "AI Mediation for deal #{{dealId}}:\n\n" +
      "{{explanation}}\n\n" +
      "Proposed split:\n" +
      "Seller: {{sellerPercent}}% ({{sellerAmount}} {{currency}})\n" +
      "Buyer: {{buyerPercent}}% ({{buyerAmount}} {{currency}})\n\n" +
      "Both parties must accept the resolution.",
    "dispute.mediation_error": "AI mediation error. Please try later.",
    "dispute.resolved":
      "Deal #{{dealId}} resolved.\n" +
      "Funds split: {{sellerPercent}}% to seller, {{buyerPercent}}% to buyer.",
    "dispute.resolve_error": "Error executing resolution.",
    "dispute.resolution_rejected": "AI resolution rejected. Contact the other party to discuss.",

    // Spec-based arbitration
    "dispute.spec_arbitration":
      "AI Spec-Based Arbitration — Deal #{{dealId}}\n\n" +
      "{{report}}\n\n" +
      "Proposed split:\n" +
      "Seller: {{sellerPercent}}% ({{sellerAmount}} {{currency}})\n" +
      "Buyer: {{buyerPercent}}% ({{buyerAmount}} {{currency}})",
    "dispute.spec_mediation_fallback":
      "AI Mediation for deal #{{dealId}}:\n\n" +
      "{{explanation}}\n\n" +
      "Split: {{sellerPercent}}% / {{buyerPercent}}%",

    // Applications
    "apps.offer_not_found": "Offer not found.",
    "apps.not_authorized": "Only the offer creator can view applications.",
    "apps.no_apps": "No applications yet.",
    "apps.confirm_selection":
      "Confirm selection?\n\n" +
      "Price: {{price}} {{currency}}\n" +
      "Trust Score: {{trust}}\n" +
      "Deals: {{deals}}\n" +
      "Rating: {{rating}}/5",
    "apps.confirm_selection_message": "\nMessage: {{message}}",
    "apps.app_not_found": "Application not found.",
    "apps.not_authorized_short": "Not authorized.",
    "apps.deal_from_offer":
      "Deal #{{dealId}} created from offer!\n\n" +
      "{{description}}\n" +
      "Amount: {{price}} {{currency}}\n\n" +
      "Notification sent to the selected applicant.",
    "apps.selected_notification":
      "You've been selected for a deal!\n\n" +
      "{{description}}\n" +
      "Amount: {{price}} {{currency}}\n" +
      "Deal #{{dealId}}",
    "apps.offer_filled": 'The offer "{{description}}" has been filled. Your application was not selected.',
    "apps.deal_error": "Error creating deal. Please try again.",

    // Risk assessment
    "risk.assessment":
      "AI Risk Assessment — Deal #{{dealId}}\n\n" +
      "Buyer: {{buyerEmoji}} {{buyerLevel}} (score: {{buyerScore}})\n" +
      "Seller: {{sellerEmoji}} {{sellerLevel}} (score: {{sellerScore}})",
    "risk.recommendations": "\nRecommendations:\n{{recommendations}}",

    // Group commands
    "stats.groups_only": "This command works only in groups.",
    "stats.no_activity": "No escrow activity in this group yet.\n\nUse @{{botUsername}} in inline mode to post offers!",
    "stats.report":
      "Group Escrow Stats\n\n" +
      "Offers posted: {{offers}}\n" +
      "Deals completed: {{deals}}\n" +
      "Total volume: {{volume}} TON\n" +
      "Avg check: {{avgCheck}} TON\n" +
      "Conversion: {{conversion}}\n\n" +
      "Powered by izEscrowAI",
    "leaderboard.empty": "No groups with escrow activity yet.",

    // /spec command
    "spec.usage": "Usage: /spec <task description>\n\nExample: /spec Design a logo for my coffee shop",
    "spec.clarification_command": "I need some clarification:\n\n{{questions}}\n\nPlease answer these questions:",
    "spec.generation_error": "Error generating spec. Please try again.",

    // Spec callbacks
    "spec.expired": "Spec expired. Please generate again.",
    "spec.published":
      "Spec published! ID: {{specId}}\n\n" +
      "Title: {{title}}\nCategory: {{category}}",
    "spec.price_estimate": "\n\nAI Price Estimate:\n{{estimate}}",
    "spec.edit_prompt": "Send your corrections (e.g., 'Add mobile responsive design requirement' or 'Change category to Design'):",
    "spec.not_found": "Spec not found.",
    "spec.price_for_title": 'AI Price Estimate for "{{title}}":\n\n{{estimate}}\n\nThis is an AI estimate, not a market price.',
    "spec.price_error": "Could not estimate price. Please try again.",

    // Post as offer
    "spec.post_as_offer":
      "To post as a public offer, use inline mode:\n\n" +
      "Type @{{botUsername}} {{title}}\n\n" +
      "in any chat to create a public offer.",

    // /profile command
    "profile.categories": "Your profile categories: {{categories}}\n\nSelect your professional categories:",
    "profile.selected": "Selected: {{categories}}\n\nSelect your professional categories:",
    "profile.updated": "Profile updated! Categories: {{categories}}",

    // /score command
    "score.report":
      "Your Trust Score: {{badge}}\n\n" +
      "Breakdown:\n" +
      "Completed deals: {{deals}}\n" +
      "Avg rating: {{rating}}/5\n" +
      "Wallet: {{wallet}}\n" +
      "Disputes lost: {{disputes}}\n\n" +
      "Complete more deals and maintain good ratings to increase your score!",
    "score.wallet_connected": "Connected",
    "score.wallet_not_connected": "Not connected",

    // /myoffers command
    "myoffers.empty": "You have no offers. Create one via inline mode: @{{botUsername}} <description>",
    "myoffers.title": "Your offers:",
    "myoffers.cancelled": "Offer cancelled.",

    // Inline
    "inline.closed": "CLOSED: {{description}}\n\nDeal created — {{price}} {{currency}}\n\nPowered by izEscrowAI",
    "inline.expired": "EXPIRED: {{description}}\n\nThis offer has expired.\n\nPowered by izEscrowAI",
  },

  ru: {
    // /start command
    "start.welcome":
      "Добро пожаловать в izEscrowAI!\n\n" +
      "Я AI-агент для безопасных P2P-сделок в Telegram. " +
      "Средства хранятся в смарт-контракте на TON, не у бота.\n\n" +
      "Как создать сделку:\n" +
      "Просто напишите что-то вроде:\n" +
      "«Продаю дизайн логотипа @ivan за 50 TON»\n\n" +
      "Команды:\n" +
      "/help — список команд\n" +
      "/wallet — подключить кошелёк\n" +
      "/mydeals — мои сделки",
    "start.jobs_notice": "\n\nУ вас {{count}} заказ(ов) из Telegram-групп! Откройте профиль, чтобы увидеть откликнувшихся исполнителей.",

    // Deep link: offer
    "start.offer_unavailable": "Это предложение больше недоступно.",
    "start.offer_self_apply": "Нельзя откликнуться на собственное предложение.",
    "start.offer_details":
      "Предложение: {{description}}\n" +
      "Цена: {{price}}\n" +
      "Откликов: {{appCount}}\n\n" +
      "Введите вашу цену:",
    "start.offer_price_negotiable": "Договорная",
    "start.offer_price_from": "от {{min_price}} {{currency}}",

    // Deep link: deal
    "start.deal_not_found": "Сделка не найдена или уже отменена.",
    "start.deal_already_status": "Сделка #{{dealId}} уже в статусе: {{status}}.\nИспользуйте /mydeals для просмотра.",
    "start.deal_invite":
      "Вас пригласили в сделку #{{dealId}}:\n\n" +
      "Описание: {{description}}\n" +
      "Сумма: {{amount}}\n\n" +
      "Принять сделку?",

    // /help command
    "help":
      "Доступные команды:\n\n" +
      "/start — начать\n" +
      "/help — эта справка\n" +
      "/wallet — подключить TON-кошелёк через Mini App\n" +
      "/mydeals — список ваших сделок\n\n" +
      "Создать сделку:\n" +
      "Напишите на обычном языке, например:\n" +
      "• «Продаю дизайн сайта @buyer за 100 TON»\n" +
      "• «Хочу купить логотип у @designer за 50 TON»\n\n" +
      "Бот распознает участников, сумму и описание, затем попросит подтвердить.",

    // /wallet command
    "wallet.prompt": "Подключите TON-кошелёк через Mini App:",

    // /mydeals command
    "mydeals.empty": "У вас пока нет сделок. Создайте первую!",
    "mydeals.title": "Ваши сделки:",

    // Spec conversation
    "spec.conversation_limit": "Лимит диалога исчерпан. Начните сначала с /spec <описание>",
    "spec.follow_up": "Уточняющие вопросы:\n\n{{questions}}\n\nПожалуйста, ответьте:",
    "spec.error_input": "Ошибка обработки. Попробуйте снова или начните с /spec.",

    // Offer bid flow
    "bid.invalid_price": "Введите корректную цену (число).",
    "bid.enter_message": "Принято! Добавьте сообщение (или /skip, чтобы отправить без него):",
    "bid.offer_unavailable": "Это предложение больше недоступно.",
    "bid.submitted":
      "Ваша заявка отправлена!\n" +
      "Цена: {{price}} {{currency}}\n" +
      "{{message}}" +
      "\nАвтор предложения будет уведомлён.",
    "bid.submitted_message": "Сообщение: {{message}}\n",
    "bid.new_application":
      "Новый отклик на ваше предложение!\n\n" +
      "Предложение: {{description}}\n" +
      "От: @{{username}} ({{trust}})\n" +
      "Цена: {{price}} {{currency}}",
    "bid.new_application_message": "\nСообщение: {{message}}",
    "bid.trust_new_user": "Новый пользователь",

    // Off-platform payment warning
    "off_platform_warning":
      "Похоже, вы обсуждаете оплату вне платформы. " +
      "Для вашей безопасности рекомендуем использовать встроенную защиту izEscrow. " +
      "Средства защищены смарт-контрактом — продавец получает оплату только после подтверждения доставки.\n\n" +
      "Чтобы создать безопасную сделку, просто опишите её: «Продаю дизайн логотипа @username за 50 TON»",

    // Deal action fallback
    "deal_action.fallback": "Используйте кнопки в сообщениях сделок для действий.",

    // Spec creation (natural language)
    "spec.generating": "Генерирую спецификацию...",
    "spec.clarification": "Мне нужно уточнение:\n\n{{questions}}\n\nПожалуйста, ответьте:",
    "spec.error_generate": "Ошибка генерации спецификации. Попробуйте /spec <описание>.",

    // Pricing request
    "pricing.estimating": "Оцениваю стоимость...",
    "pricing.result":
      "AI-оценка стоимости:\n\n{{estimate}}\n\n" +
      "Это AI-оценка на основе сложности задачи.\n" +
      "Для подробной спецификации используйте /spec <описание>.",
    "pricing.error": "Не удалось оценить стоимость. Попробуйте /spec <описание> для полного анализа.",

    // Offer creation suggestion
    "offer.use_inline":
      "Это похоже на публичное предложение. Используйте инлайн-режим:\n\n" +
      "Введите @{{botUsername}} {{text}}\n" +
      "в любом чате, чтобы создать публичное предложение.",

    // Deal creation — missing fields
    "deal.missing_fields":
      "Не удалось распознать все параметры сделки.\n" +
      "Не хватает: {{fields}}\n\n" +
      "Попробуйте точнее, например:\n" +
      "«Продаю дизайн логотипа @ivan за 50 TON»",
    "deal.missing_amount": "Не удалось определить сумму или описание. Попробуйте снова.",

    // Deal confirmation prompt
    "deal.confirm_prompt":
      "Распознанная сделка:\n\n" +
      "Продавец: @{{seller}} ({{sellerDeals}} сделок, {{sellerRating}})\n" +
      "Покупатель: @{{buyer}} ({{buyerDeals}} сделок)\n" +
      "Сумма: {{amount}} {{currency}}\n" +
      "Описание: {{description}}\n\n" +
      "Всё верно?",
    "deal.too_many_pending": "У вас слишком много ожидающих сделок. Сначала подтвердите или отмените существующие.",

    // Deal created callbacks
    "deal.data_expired": "Данные сделки устарели. Пожалуйста, создайте сделку заново.",
    "deal.created_notified":
      "Сделка #{{dealId}} создана!\n\n" +
      "Продавец: @{{seller}}\n" +
      "Покупатель: @{{buyer}}\n" +
      "Сумма: {{amount}}\n" +
      "Описание: {{description}}\n\n" +
      "Уведомление отправлено @{{counterparty}}.",
    "deal.created_deep_link":
      "Сделка #{{dealId}} создана!\n\n" +
      "Продавец: @{{seller}}\n" +
      "Покупатель: @{{buyer}}\n" +
      "Сумма: {{amount}}\n" +
      "Описание: {{description}}\n\n" +
      "@{{counterparty}} ещё не в боте.\n" +
      "Поделитесь ссылкой:\n{{deepLink}}",
    "deal.new_deal_notification":
      "Новая сделка #{{dealId}} от @{{sender}}:\n\n" +
      "Описание: {{description}}\n" +
      "Сумма: {{amount}}\n\n" +
      "Принять?",
    "deal.creation_error": "Ошибка создания сделки. Попробуйте снова.",
    "deal.creation_cancelled": "Создание сделки отменено.",

    // Deal confirmation by counterparty
    "deal.confirm_failed": "Не удалось подтвердить сделку.",
    "deal.confirmed_need_wallets":
      "Сделка #{{dealId}} подтверждена!\n\n" +
      "Обоим участникам нужно подключить TON-кошелёк для продолжения.",
    "deal.confirmed_pay":
      "Сделка #{{dealId}} подтверждена!\n" +
      "Контракт: {{contractAddress}}\n\n" +
      "Покупатель, оплатите:",
    "deal.deploy_error": "Ошибка деплоя контракта.",
    "deal.deploy_error_retry": "Ошибка деплоя контракта. Попробуйте позже.",

    // Deal rejected
    "deal.rejected": "Сделка #{{dealId}} отклонена.",

    // Delivery
    "delivery.mark_failed": "Не удалось отметить как доставленное.",
    "delivery.marked":
      "Сделка #{{dealId}}: продавец отметил доставку.\n\n" +
      "У покупателя 7 дней, чтобы подтвердить или открыть спор.",
    "delivery.complete_failed": "Не удалось завершить сделку.",
    "delivery.completed":
      "Сделка #{{dealId}} завершена!\n" +
      "Средства отправлены продавцу.\n\n" +
      "Оцените сделку:",
    "delivery.complete_error": "Ошибка завершения сделки. Попробуйте позже.",
    "delivery.rated": "Сделка #{{dealId}} завершена! Оценка: {{stars}}",

    // Dispute
    "dispute.open_failed": "Не удалось открыть спор.",
    "dispute.opened_spec":
      "Сделка #{{dealId}}: спор открыт.\n\n" +
      "К этой сделке привязана спецификация с {{reqCount}} требованиями.\n" +
      "AI оценит доставку по критериям спецификации.\n\n" +
      "Обоим участникам нужно предоставить доказательства:",
    "dispute.evidence_request":
      "Открыт спор по сделке #{{dealId}}.\n\n" +
      "Опишите свою позицию и предоставьте доказательства выполнения/невыполнения.\n" +
      "Отправьте доказательства в ответ:",
    "dispute.evidence_seller": "(Вы — продавец)",
    "dispute.evidence_buyer": "(Вы — покупатель)",
    "dispute.opened_no_spec":
      "Сделка #{{dealId}}: спор открыт.\n\n" +
      "AI проанализирует ситуацию и предложит решение.",
    "dispute.mediation":
      "AI-медиация по сделке #{{dealId}}:\n\n" +
      "{{explanation}}\n\n" +
      "Предложенное разделение:\n" +
      "Продавец: {{sellerPercent}}% ({{sellerAmount}} {{currency}})\n" +
      "Покупатель: {{buyerPercent}}% ({{buyerAmount}} {{currency}})\n\n" +
      "Обе стороны должны принять решение.",
    "dispute.mediation_error": "Ошибка AI-медиации. Попробуйте позже.",
    "dispute.resolved":
      "Сделка #{{dealId}} разрешена.\n" +
      "Разделение средств: {{sellerPercent}}% продавцу, {{buyerPercent}}% покупателю.",
    "dispute.resolve_error": "Ошибка исполнения решения.",
    "dispute.resolution_rejected": "AI-решение отклонено. Свяжитесь с другой стороной для обсуждения.",

    // Spec-based arbitration
    "dispute.spec_arbitration":
      "AI-арбитраж по спецификации — Сделка #{{dealId}}\n\n" +
      "{{report}}\n\n" +
      "Предложенное разделение:\n" +
      "Продавец: {{sellerPercent}}% ({{sellerAmount}} {{currency}})\n" +
      "Покупатель: {{buyerPercent}}% ({{buyerAmount}} {{currency}})",
    "dispute.spec_mediation_fallback":
      "AI-медиация по сделке #{{dealId}}:\n\n" +
      "{{explanation}}\n\n" +
      "Разделение: {{sellerPercent}}% / {{buyerPercent}}%",

    // Applications
    "apps.offer_not_found": "Предложение не найдено.",
    "apps.not_authorized": "Только автор предложения может просматривать отклики.",
    "apps.no_apps": "Откликов пока нет.",
    "apps.confirm_selection":
      "Подтвердить выбор?\n\n" +
      "Цена: {{price}} {{currency}}\n" +
      "Trust Score: {{trust}}\n" +
      "Сделок: {{deals}}\n" +
      "Рейтинг: {{rating}}/5",
    "apps.confirm_selection_message": "\nСообщение: {{message}}",
    "apps.app_not_found": "Отклик не найден.",
    "apps.not_authorized_short": "Нет доступа.",
    "apps.deal_from_offer":
      "Сделка #{{dealId}} создана из предложения!\n\n" +
      "{{description}}\n" +
      "Сумма: {{price}} {{currency}}\n\n" +
      "Уведомление отправлено выбранному исполнителю.",
    "apps.selected_notification":
      "Вас выбрали для сделки!\n\n" +
      "{{description}}\n" +
      "Сумма: {{price}} {{currency}}\n" +
      "Сделка #{{dealId}}",
    "apps.offer_filled": "Предложение «{{description}}» закрыто. Ваш отклик не был выбран.",
    "apps.deal_error": "Ошибка создания сделки. Попробуйте снова.",

    // Risk assessment
    "risk.assessment":
      "AI-оценка рисков — Сделка #{{dealId}}\n\n" +
      "Покупатель: {{buyerEmoji}} {{buyerLevel}} (оценка: {{buyerScore}})\n" +
      "Продавец: {{sellerEmoji}} {{sellerLevel}} (оценка: {{sellerScore}})",
    "risk.recommendations": "\nРекомендации:\n{{recommendations}}",

    // Group commands
    "stats.groups_only": "Эта команда работает только в группах.",
    "stats.no_activity": "В этой группе ещё нет escrow-активности.\n\nИспользуйте @{{botUsername}} в инлайн-режиме для создания предложений!",
    "stats.report":
      "Статистика группы\n\n" +
      "Предложений: {{offers}}\n" +
      "Сделок завершено: {{deals}}\n" +
      "Общий объём: {{volume}} TON\n" +
      "Средний чек: {{avgCheck}} TON\n" +
      "Конверсия: {{conversion}}\n\n" +
      "Powered by izEscrowAI",
    "leaderboard.empty": "Групп с escrow-активностью пока нет.",

    // /spec command
    "spec.usage": "Использование: /spec <описание задачи>\n\nПример: /spec Разработать логотип для моей кофейни",
    "spec.clarification_command": "Мне нужно уточнение:\n\n{{questions}}\n\nПожалуйста, ответьте на вопросы:",
    "spec.generation_error": "Ошибка генерации спецификации. Попробуйте снова.",

    // Spec callbacks
    "spec.expired": "Спецификация устарела. Сгенерируйте заново.",
    "spec.published":
      "Спецификация опубликована! ID: {{specId}}\n\n" +
      "Название: {{title}}\nКатегория: {{category}}",
    "spec.price_estimate": "\n\nAI-оценка стоимости:\n{{estimate}}",
    "spec.edit_prompt": "Отправьте ваши правки (например, «Добавить требование мобильной адаптивности» или «Изменить категорию на Дизайн»):",
    "spec.not_found": "Спецификация не найдена.",
    "spec.price_for_title": 'AI-оценка стоимости для «{{title}}»:\n\n{{estimate}}\n\nЭто AI-оценка, а не рыночная цена.',
    "spec.price_error": "Не удалось оценить стоимость. Попробуйте снова.",

    // Post as offer
    "spec.post_as_offer":
      "Чтобы опубликовать как предложение, используйте инлайн-режим:\n\n" +
      "Введите @{{botUsername}} {{title}}\n\n" +
      "в любом чате для создания публичного предложения.",

    // /profile command
    "profile.categories": "Ваши категории: {{categories}}\n\nВыберите профессиональные категории:",
    "profile.selected": "Выбрано: {{categories}}\n\nВыберите профессиональные категории:",
    "profile.updated": "Профиль обновлён! Категории: {{categories}}",

    // /score command
    "score.report":
      "Ваш Trust Score: {{badge}}\n\n" +
      "Детали:\n" +
      "Завершённых сделок: {{deals}}\n" +
      "Средний рейтинг: {{rating}}/5\n" +
      "Кошелёк: {{wallet}}\n" +
      "Проигранных споров: {{disputes}}\n\n" +
      "Завершайте больше сделок и поддерживайте хорошие оценки для повышения рейтинга!",
    "score.wallet_connected": "Подключён",
    "score.wallet_not_connected": "Не подключён",

    // /myoffers command
    "myoffers.empty": "У вас нет предложений. Создайте через инлайн-режим: @{{botUsername}} <описание>",
    "myoffers.title": "Ваши предложения:",
    "myoffers.cancelled": "Предложение отменено.",

    // Inline
    "inline.closed": "ЗАКРЫТО: {{description}}\n\nСделка создана — {{price}} {{currency}}\n\nPowered by izEscrowAI",
    "inline.expired": "ИСТЕКЛО: {{description}}\n\nСрок предложения истёк.\n\nPowered by izEscrowAI",
  },
};

export function getLang(languageCode?: string): Lang {
  return languageCode?.startsWith("ru") ? "ru" : "en";
}

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let msg = messages[lang][key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return msg;
}

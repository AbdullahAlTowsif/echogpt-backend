import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(@Inject(ChatService) private readonly chatService: ChatService) { }

    @Post('messages')
    sendMessage(@CurrentUser('sub') userId: string, @Body() dto: SendMessageDto) {
        return this.chatService.sendMessage(userId, dto);
    }

    @Get('conversations')
    listConversations(@CurrentUser('sub') userId: string) {
        return this.chatService.listConversations(userId);
    }

    @Get('conversations/:id/messages')
    getHistory(@CurrentUser('sub') userId: string, @Param('id') id: string) {
        return this.chatService.getHistory(userId, id);
    }
}

<?php

namespace App\Enums;

enum FindingStatus: string
{
    case Open = 'open';
    case Progress = 'progress';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::Progress => 'Progress',
            self::Closed => 'Closed',
        };
    }
}

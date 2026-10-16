<?php

it('does not expose the component dev page outside the local environment', function () {
    $this->get('/_dev/komponen')->assertNotFound();
});

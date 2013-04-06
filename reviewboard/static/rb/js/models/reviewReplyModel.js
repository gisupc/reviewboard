/*
 * Review replies.
 *
 * Encapsulates replies to a top-level review.
 */
RB.ReviewReply = RB.BaseResource.extend({
    defaults: _.defaults({
        review: null,
        public: false,
        bodyTop: null,
        bodyBottom: null
    }, RB.BaseResource.prototype.defaults),

    rspNamespace: 'reply',
    listKey: 'replies',

    COMMENT_LINK_NAMES: [
        'diff_comments',
        'file_attachment_comments',
        'screenshot_comments'
    ],

    toJSON: function() {
        return {
            'public': this.get('public'),
            'body_top': this.get('bodyTop'),
            'body_bottom': this.get('bodyBottom')
        };
    },

    parse: function(rsp) {
        var result = RB.BaseResource.prototype.parse.call(this, rsp),
            rspData = rsp[this.rspNamespace];

        result.bodyTop = rspData.body_top;
        result.bodyBottom = rspData.body_bottom;
        result.public = rspData.public;

        return result;
    },

    /*
     * Discards the reply if it's empty.
     *
     * If the reply doesn't have any remaining comments on the server, then
     * this will discard the reply.
     *
     * When we've finished checking, options.success will be called. It
     * will be passed true if discarded, or false otherwise.
     */
    discardIfEmpty: function(options, context) {
        options = _.bindCallbacks(options || {}, context);
        options.success = options.success || function() {};

        this.ready({
            ready: function() {
                if (this.isNew() ||
                    this.get('bodyTop') ||
                    this.get('bodyBottom')) {
                    options.success(false);
                    return;
                }

                this._checkCommentsLink(0, options, context);
            },

            error: options.error
        }, this);
    },

    /*
     * Checks if there are comments, given the comment type.
     *
     * This is part of the discardIfEmpty logic.
     *
     * If there are comments, we'll give up and call options.success(false).
     *
     * If there are no comments, we'll move on to the next comment type. If
     * we're done, the reply is discarded, and options.success(true) is called.
     */
    _checkCommentsLink: function(linkNameIndex, options, context) {
        var self = this,
            linkName = this.COMMENT_LINK_NAMES[linkNameIndex],
            url = this.get('links')[linkName].href;

        RB.apiCall({
            type: 'GET',
            url: url,
            success: function(rsp) {
                if (rsp[linkName].length > 0) {
                    if (options.success) {
                        options.success(false);
                    }
                } else if (linkNameIndex < self.COMMENT_LINK_NAMES.length - 1) {
                    self._checkCommentsLink(linkNameIndex + 1, options,
                                            context);
                } else {
                    self.destroy(
                    _.defaults({
                        success: function() {
                            options.success(true);
                        }
                    }, options),
                    context);
                }
            },
            error: options.error
        });
    }
});
_.extend(RB.ReviewReply.prototype, RB.DraftResourceModelMixin);
